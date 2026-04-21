/**
 * Lógica de Engenharia de Custos — Point ERP/CRM
 * Fórmulas para depreciação de equipamentos e precificação de kits.
 */

export interface MaquinaCalculo {
  valorCompra: number;
  vidaUtilMeses: number;
  horasUsoDia: number;
  diasUteisMes: number;
  custoManutencaoAnual: number;
}

/**
 * Depreciação de Equipamento → Custo por Minuto
 *
 * Fórmula:
 *   Custo/min = (Deprec. Mensal + Manutenção Mensal) / Minutos Úteis/Mês
 *
 * Onde:
 *   Deprec. Mensal    = Valor_Compra / Vida_Útil_Meses
 *   Manutenção Mensal = Custo_Manutenção_Anual / 12
 *   Minutos Úteis/Mês = Dias_Úteis × Horas/Dia × 60
 */
export const calcularCustoMinutoMaquina = (maquina: MaquinaCalculo): number => {
  const minutosUteisMes = maquina.diasUteisMes * maquina.horasUsoDia * 60;
  const depreciacaoMensal = maquina.valorCompra / maquina.vidaUtilMeses;
  const manutencaoMensal = maquina.custoManutencaoAnual / 12;
  return (depreciacaoMensal + manutencaoMensal) / minutosUteisMes;
};

export interface ItemComposicao {
  custoInsumo: number;        // custo unitário do insumo (R$/unidade)
  quantidade: number;         // quantidade usada no produto
  desperdicio: number;        // fração de desperdício (ex: 0.05 = 5%)
  tempoMaquinaMinutos: number;
  custoMinutoMaquina: number;
}

/**
 * Custo Total do Produto (Kit)
 *
 * Fórmula por item:
 *   Custo_Insumo  = Qtd × Custo_Unit × (1 + %Desperdício)
 *   Custo_Máquina = Tempo_min × Custo/min
 *
 * Custo_MãoDeObra = (Σ Tempo_min / 60) × Custo_Hora_MO
 */
export const calcularCustoTotalProduto = (
  itens: ItemComposicao[],
  custoMaoDeObraHora: number
): number => {
  let custoInsumosMaquinas = 0;
  let tempoTotalMinutos = 0;

  for (const item of itens) {
    const custoInsumo = item.custoInsumo * item.quantidade * (1 + item.desperdicio);
    const custoMaquina = item.tempoMaquinaMinutos * item.custoMinutoMaquina;
    custoInsumosMaquinas += custoInsumo + custoMaquina;
    tempoTotalMinutos += item.tempoMaquinaMinutos;
  }

  const custoMaoDeObra = (tempoTotalMinutos / 60) * custoMaoDeObraHora;
  return custoInsumosMaquinas + custoMaoDeObra;
};

/**
 * Preço de Venda com Markup Multiplicador
 *
 * Preço = Custo × Markup
 * Margem = (Preço - Custo) / Preço × 100
 *
 * Exemplo: markup 2.8 → margem bruta de ~64%
 */
export const calcularPrecoVenda = (custoTotal: number, markup: number): number => {
  return Math.round(custoTotal * markup * 100) / 100;
};

export const calcularMargem = (custo: number, preco: number): number => {
  if (preco === 0) return 0;
  return Math.round(((preco - custo) / preco) * 10000) / 100; // retorna %
};
