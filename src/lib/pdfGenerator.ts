/**
 * Gerador de PDF — POINT ERP/CRM
 * Usa jsPDF v4 sem autoTable (que quebrou na v4).
 * Constrói a tabela manualmente com linhas e retângulos.
 */
import { jsPDF } from 'jspdf';
import type { Pedido } from './supabase';

export interface ItemPDF {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export const generateBudgetPDF = (pedido: Pedido, itens: ItemPDF[]) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = 210; // page width
  const ml = 15; // margin left
  const mr = 195; // margin right

  // ── Cabeçalho ─────────────────────────────────────────────
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pw, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('POINT', ml, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestão de Gráfica', ml, 19);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', pw / 2, 13, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${pedido.codigo}`, pw / 2, 20, { align: 'center' });

  // ── Dados do cliente ──────────────────────────────────────
  let y = 38;
  const clienteNome = pedido.clientes?.nome || pedido.cliente_nome_avulso || 'Cliente';
  const clienteZap  = pedido.clientes?.whatsapp || pedido.cliente_contato_avulso || '';

  doc.setFillColor(248, 248, 255);
  doc.roundedRect(ml, y - 5, mr - ml, 26, 3, 3, 'F');

  doc.setTextColor(100, 100, 120);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', ml + 4, y + 1);
  doc.text('CONTATO', 110, y + 1);
  doc.text('ENTREGA', 165, y + 1);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(clienteNome.substring(0, 40), ml + 4, y + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(clienteZap || '—', 110, y + 8);

  const entrega = pedido.data_entrega
    ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR')
    : '—';
  doc.text(entrega, 165, y + 8);

  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, ml + 4, y + 16);

  // ── Tabela de itens ────────────────────────────────────────
  y += 34;

  // Header da tabela
  doc.setFillColor(79, 70, 229);
  doc.rect(ml, y, mr - ml, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUTO / SERVIÇO', ml + 3, y + 5.5);
  doc.text('QTD', 143, y + 5.5, { align: 'center' });
  doc.text('VLR UNIT.', 162, y + 5.5, { align: 'center' });
  doc.text('SUBTOTAL', mr - 3, y + 5.5, { align: 'right' });

  y += 8;

  // Linhas dos itens
  const linhaH = 9;
  const itensParaExibir = itens.length > 0 ? itens : [
    { descricao: pedido.observacoes || 'Conforme orçado', quantidade: 1, valor_unitario: Number(pedido.valor_total), valor_total: Number(pedido.valor_total) }
  ];

  itensParaExibir.forEach((item, idx) => {
    const fillColor = idx % 2 === 0 ? [248, 248, 255] : [255, 255, 255];
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.rect(ml, y, mr - ml, linhaH, 'F');

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Descrição (truncate se muito longo)
    const desc = item.descricao.substring(0, 55);
    doc.text(desc, ml + 3, y + 6);
    doc.text(String(item.quantidade), 143, y + 6, { align: 'center' });
    doc.text(`R$ ${Number(item.valor_unitario).toFixed(2)}`, 162, y + 6, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${Number(item.valor_total).toFixed(2)}`, mr - 3, y + 6, { align: 'right' });

    y += linhaH;
  });

  // Linha de separação
  doc.setDrawColor(200, 200, 230);
  doc.line(ml, y, mr, y);

  // Total
  y += 2;
  doc.setFillColor(79, 70, 229, 0.1);
  doc.setFillColor(240, 238, 255);
  doc.rect(ml, y, mr - ml, 11, 'F');

  doc.setTextColor(79, 70, 229);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 155, y + 7.5);
  doc.text(`R$ ${Number(pedido.valor_total).toFixed(2)}`, mr - 3, y + 7.5, { align: 'right' });

  y += 18;

  // ── Condições ──────────────────────────────────────────────
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(ml, y, mr - ml, 28, 3, 3, 'F');
  doc.setDrawColor(220, 220, 235);
  doc.roundedRect(ml, y, mr - ml, 28, 3, 3, 'S');

  doc.setTextColor(100, 100, 120);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDIÇÕES', ml + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 100);
  doc.text('• Este orçamento é válido por 7 dias corridos.', ml + 4, y + 12);
  doc.text('• A produção inicia após aprovação da arte e confirmação do pagamento.', ml + 4, y + 18);
  doc.text('• Prazo de entrega contado a partir da confirmação.', ml + 4, y + 24);

  // ── Rodapé ─────────────────────────────────────────────────
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 282, pw, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('POINT — Sistema de Gestão para Gráficas', pw / 2, 289, { align: 'center' });
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pw / 2, 293, { align: 'center' });

  doc.save(`orcamento_point_${pedido.codigo}.pdf`);
};
