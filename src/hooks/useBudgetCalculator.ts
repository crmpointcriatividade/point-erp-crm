import { useState, useEffect } from 'react';
import {
  calcularCustoMinutoMaquina,
  calcularCustoTotalProduto,
  calcularPrecoVenda,
  calcularMargem,
  type ItemComposicao,
} from '../lib/costEngineering';
import { supabase } from '../lib/supabase';

interface BudgetResult {
  custoInsumos: number;
  custoMaquinas: number;
  custoMaoDeObra: number;
  custoTotal: number;
  precoSugerido: number;
  markup: number;
  margem: number; // %
}

export function useBudgetCalculator(produtoId: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<BudgetResult | null>(null);

  useEffect(() => {
    if (!produtoId) {
      setBudget(null);
      return;
    }

    async function fetchAndCalculate() {
      setLoading(true);
      setError(null);

      const { data: composicao, error: err } = await supabase
        .from('composicao_produtos')
        .select(`
          quantidade_insumo,
          tempo_maquina_minutos,
          percentual_desperdicio,
          insumos (custo_unitario),
          maquinas (valor_compra, vida_util_meses, horas_uso_dia, dias_uteis_mes, custo_manutencao_anual),
          produtos (markup_sugerido, custo_mao_obra_hora)
        `)
        .eq('produto_id', produtoId);

      if (err || !composicao) {
        setError('Erro ao buscar composição do produto.');
        setLoading(false);
        return;
      }

      const markup = (composicao[0]?.produtos as any)?.markup_sugerido ?? 2.5;
      const custoMaoDeObraHora = (composicao[0]?.produtos as any)?.custo_mao_obra_hora ?? 25;

      const itens: ItemComposicao[] = composicao.map((c: any) => ({
        custoInsumo: c.insumos?.custo_unitario ?? 0,
        quantidade: c.quantidade_insumo ?? 0,
        desperdicio: (c.percentual_desperdicio ?? 0) / 100,
        tempoMaquinaMinutos: c.tempo_maquina_minutos ?? 0,
        custoMinutoMaquina: c.maquinas
          ? calcularCustoMinutoMaquina({
              valorCompra: c.maquinas.valor_compra,
              vidaUtilMeses: c.maquinas.vida_util_meses,
              horasUsoDia: c.maquinas.horas_uso_dia,
              diasUteisMes: c.maquinas.dias_uteis_mes ?? 22,
              custoManutencaoAnual: c.maquinas.custo_manutencao_anual,
            })
          : 0,
      }));

      const custoTotal = calcularCustoTotalProduto(itens, custoMaoDeObraHora);
      const precoSugerido = calcularPrecoVenda(custoTotal, markup);

      // Breakdown
      const custoInsumos = itens.reduce(
        (acc, i) => acc + i.custoInsumo * i.quantidade * (1 + i.desperdicio),
        0
      );
      const custoMaquinas = itens.reduce(
        (acc, i) => acc + i.tempoMaquinaMinutos * i.custoMinutoMaquina,
        0
      );
      const custoMaoDeObra =
        (itens.reduce((acc, i) => acc + i.tempoMaquinaMinutos, 0) / 60) *
        custoMaoDeObraHora;

      setBudget({
        custoInsumos,
        custoMaquinas,
        custoMaoDeObra,
        custoTotal,
        precoSugerido,
        markup,
        margem: calcularMargem(custoTotal, precoSugerido),
      });
      setLoading(false);
    }

    fetchAndCalculate();
  }, [produtoId]);

  return { budget, loading, error };
}
