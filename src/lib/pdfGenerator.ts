import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { Pedido } from './supabase';

interface ItemPDF {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export const generateBudgetPDF = (pedido: Pedido, itens: ItemPDF[]) => {
  const doc = new jsPDF();
  const clienteNome = pedido.clientes?.nome || pedido.cliente_nome_avulso || 'Cliente';
  const clienteContato = pedido.clientes?.whatsapp || pedido.cliente_contato_avulso || 'N/A';

  // Cabeçalho
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229);
  doc.text('POINT', 20, 22);

  doc.setFontSize(10);
  doc.setTextColor(160, 160, 160);
  doc.text('Gestão de Gráfica', 20, 28);

  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text('Orçamento', 105, 22, { align: 'center' });

  // Linha separadora
  doc.setDrawColor(230, 230, 230);
  doc.line(20, 34, 190, 34);

  // Dados do orçamento
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Código: #${pedido.codigo}`, 20, 44);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 50);

  if (pedido.data_entrega) {
    const entrega = new Date(pedido.data_entrega).toLocaleDateString('pt-BR');
    doc.text(`Entrega prevista: ${entrega}`, 20, 56);
  }

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.text(`Cliente: ${clienteNome}`, 105, 44, { align: 'center' });
  doc.text(`Contato: ${clienteContato}`, 105, 50, { align: 'center' });

  // Tabela de itens
  (doc as any).autoTable({
    startY: 68,
    head: [['Produto / Serviço', 'Qtd', 'Vlr Unit.', 'Subtotal']],
    body: itens.map((item) => [
      item.descricao,
      item.quantidade,
      `R$ ${Number(item.valor_unitario).toFixed(2)}`,
      `R$ ${Number(item.valor_total).toFixed(2)}`,
    ]),
    headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    foot: [['', '', 'TOTAL:', `R$ ${Number(pedido.valor_total).toFixed(2)}`]],
    footStyles: {
      fillColor: [240, 240, 255],
      textColor: [79, 70, 229],
      fontStyle: 'bold',
      fontSize: 11,
    },
    styles: { font: 'helvetica', fontSize: 10 },
    columnStyles: { 0: { cellWidth: 90 } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 14;

  // Condições
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text('Condições:', 20, finalY);
  doc.text('• Este orçamento é válido por 7 dias corridos.', 20, finalY + 6);
  doc.text('• A produção inicia após aprovação da arte e confirmação do pagamento.', 20, finalY + 12);
  doc.text('• Prazo de entrega contado a partir da confirmação.', 20, finalY + 18);

  // Rodapé
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} — POINT ERP/CRM`,
    105,
    285,
    { align: 'center' }
  );

  doc.save(`orcamento_point_${pedido.codigo}.pdf`);
};
