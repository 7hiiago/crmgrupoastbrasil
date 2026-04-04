import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DB, fmt, fmtDate } from './db';
import type { Negociacao, Recorrente, PropConfig } from './types';

export function gerarPropostaPDF(neg: Negociacao | Recorrente, tipo: 'negociacao' | 'recorrente' = 'negociacao') {
  const cfg = DB.getObj<PropConfig>('propConfig');
  const empresaNome = cfg.empresa || 'GRUPO AST';
  const cnpj = cfg.cnpj || '35.794.626/0001-00';
  const endereco = cfg.end || 'Av. Adjar da Silva Casé, 800, Indianópolis, Caruaru — Sala 17';
  const telefone = cfg.tel || '81 4042.3084';

  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(192, 57, 43);
  doc.rect(0, 0, w, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(empresaNome, 14, 22);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PROPOSTA COMERCIAL', w - 14, 22, { align: 'right' });

  // Company info
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`CNPJ: ${cnpj}  |  Tel: ${telefone}`, 14, 44);
  doc.text(endereco, 14, 50);

  // Line
  doc.setDrawColor(192, 57, 43);
  doc.setLineWidth(0.5);
  doc.line(14, 56, w - 14, 56);

  // Client info
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 14, 66);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const clienteNome = 'clienteNome' in neg ? neg.clienteNome : '';
  doc.text(`Cliente: ${clienteNome || '—'}`, 14, 74);

  if (tipo === 'negociacao') {
    const n = neg as Negociacao;
    doc.text(`Telefone: ${n.clienteTel || '—'}`, 14, 80);
    doc.text(`E-mail: ${n.clienteEmail || '—'}`, 14, 86);
  }

  // Project info
  let y = tipo === 'negociacao' ? 100 : 88;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(tipo === 'negociacao' ? 'PROJETO' : 'SERVIÇO RECORRENTE', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 8;

  const titulo = 'titulo' in neg ? neg.titulo : ('produto' in neg ? (neg as Recorrente).produto : '');
  doc.text(`Descrição: ${titulo || '—'}`, 14, y);
  y += 6;
  doc.text(`Código: ${neg.codigo}`, 14, y);
  y += 6;
  doc.text(`Data: ${fmtDate(neg.data)}`, 14, y);

  if (tipo === 'recorrente') {
    const r = neg as Recorrente;
    y += 6;
    doc.text(`Dia de vencimento: ${r.dia || '—'}`, 14, y);
  }

  // Value highlight
  y += 16;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, y - 6, w - 28, 30, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(tipo === 'recorrente' ? 'VALOR MENSAL' : 'INVESTIMENTO', 20, y + 4);
  doc.setFontSize(22);
  doc.setTextColor(192, 57, 43);
  doc.text(`R$ ${fmt(neg.valor || 0)}`, 20, y + 18);

  // Observations
  y += 40;
  if (neg.obs) {
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('OBSERVAÇÕES', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 8;
    const lines = doc.splitTextToSize(neg.obs, w - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5;
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(192, 57, 43);
  doc.line(14, pageH - 25, w - 14, pageH - 25);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`${empresaNome} — Proposta gerada em ${new Date().toLocaleDateString('pt-BR')}`, 14, pageH - 18);
  doc.text('Validade: 15 dias', w - 14, pageH - 18, { align: 'right' });

  doc.save(`proposta_${neg.codigo}.pdf`);
}

export function enviarPropostaWhatsApp(neg: Negociacao | Recorrente) {
  const tel = ('clienteTel' in neg ? neg.clienteTel : '') || '';
  const cleanTel = tel.replace(/\D/g, '');
  const fullTel = cleanTel.startsWith('55') ? cleanTel : '55' + cleanTel;

  const titulo = 'titulo' in neg ? neg.titulo : ('produto' in neg ? (neg as Recorrente).produto : '');
  const msg = encodeURIComponent(
    `Olá! Segue a proposta referente ao projeto "${titulo}" (${neg.codigo}), no valor de R$ ${fmt(neg.valor || 0)}. Em caso de dúvidas, estou à disposição!`
  );

  window.open(`https://wa.me/${fullTel}?text=${msg}`, '_blank');
}
