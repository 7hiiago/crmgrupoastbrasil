import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DB, fmt, fmtDate } from './db';
import type { Negociacao, Recorrente, PropConfig } from './types';

// ─────────────────────────────────────────────────────────────
//  CONFIGURAÇÕES VISUAIS
// ─────────────────────────────────────────────────────────────

const VM = 14           // margem lateral
const VERM: [number,number,number] = [192, 57, 43]   // vermelho AST
const ESCURO: [number,number,number] = [28, 28, 28]
const CINZA: [number,number,number] = [110, 110, 110]
const CINZA_CLARO: [number,number,number] = [245, 245, 245]
const BRANCO: [number,number,number] = [255, 255, 255]
const VERDE: [number,number,number] = [34, 120, 60]

function W(doc: jsPDF) { return doc.internal.pageSize.getWidth() }
function H(doc: jsPDF) { return doc.internal.pageSize.getHeight() }

function cor(doc: jsPDF, rgb: [number,number,number]) { doc.setTextColor(...rgb) }
function fundo(doc: jsPDF, rgb: [number,number,number]) { doc.setFillColor(...rgb) }
function borda(doc: jsPDF, rgb: [number,number,number]) { doc.setDrawColor(...rgb) }

function checkY(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed > H(doc) - 28) { doc.addPage(); return 24 }
  return y
}

// ─────────────────────────────────────────────────────────────
//  RODAPÉ — aplicado em todas as páginas no final
// ─────────────────────────────────────────────────────────────

function aplicarRodape(doc: jsPDF, empresa: string) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    const h = H(doc), w = W(doc)
    fundo(doc, VERM); doc.rect(0, h - 22, w, 22, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); cor(doc, BRANCO)
    doc.text(`${empresa}  ·  Proposta comercial`, VM, h - 12)
    doc.text(`Pág. ${i} / ${total}`, w - VM, h - 12, { align: 'right' })
  }
}

// ─────────────────────────────────────────────────────────────
//  BLOCO: CAPA  (primeira impressão = percepção de valor)
// ─────────────────────────────────────────────────────────────

function blocoCapa(doc: jsPDF, empresa: string, clienteNome: string, codigo: string, data: string): number {
  const w = W(doc)

  // Faixa vermelha superior
  fundo(doc, VERM); doc.rect(0, 0, w, 70, 'F')

  // Nome da empresa
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); cor(doc, [255, 200, 200])
  doc.text(empresa.toUpperCase(), VM, 16)

  // Título impactante
  doc.setFontSize(28); doc.setFont('helvetica', 'bold'); cor(doc, BRANCO)
  doc.text('PROPOSTA', VM, 38)
  doc.setFont('helvetica', 'normal')
  doc.text('COMERCIAL', VM, 52)

  // Frase de valor (âncora emocional)
  doc.setFontSize(10); cor(doc, [255, 210, 210])
  doc.text('Segurança, tecnologia e valorização para o seu imóvel.', VM, 63)

  // Bloco cinza com dados do cliente
  fundo(doc, CINZA_CLARO); doc.rect(VM, 76, w - VM * 2, 30, 'F')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); cor(doc, CINZA)
  doc.text('PREPARADO EXCLUSIVAMENTE PARA', VM + 5, 85)
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); cor(doc, ESCURO)
  doc.text(clienteNome || 'Cliente', VM + 5, 95)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); cor(doc, CINZA)
  doc.text(`Código: ${codigo}   ·   Data: ${data}`, VM + 5, 101)

  return 118
}

// ─────────────────────────────────────────────────────────────
//  BLOCO: DOR → SOLUÇÃO  (neurovendas: problema antes do produto)
// ─────────────────────────────────────────────────────────────

function blocoDorSolucao(doc: jsPDF, y: number, tipo: 'negociacao' | 'recorrente'): number {
  const w = W(doc)
  y = checkY(doc, y, 60)

  // Título da seção
  fundo(doc, ESCURO); doc.rect(VM, y, 3, 7, 'F')
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); cor(doc, ESCURO)
  doc.text('POR QUE ISSO É IMPORTANTE PARA VOCÊ?', VM + 6, y + 5.5)
  y += 13

  const dores = tipo === 'recorrente'
    ? [
        { icone: '⚠', titulo: 'Sua proteção não pode falhar',   texto: 'Equipamentos sem manutenção param de funcionar quando mais precisam. Um sistema desatualizado é uma porta aberta para riscos.' },
        { icone: '📉', titulo: 'Imóvel sem suporte desvaloriza', texto: 'Compradores e inquilinos pagam mais por ambientes monitorados e com tecnologia funcionando. Sem manutenção, você perde esse diferencial.' },
        { icone: '🔧', titulo: 'Problema pequeno vira caro',     texto: 'Uma falha detectada cedo custa 10x menos do que uma emergência. Nosso plano evita surpresas desagradáveis no momento errado.' },
      ]
    : [
        { icone: '🔒', titulo: 'Sua família merece se sentir segura em casa',     texto: 'Câmeras, alarmes e controle de acesso inteligente protegem o que você tem de mais valioso — com você monitorando de qualquer lugar.' },
        { icone: '📶', titulo: 'Internet fraca prejudica seu dia a dia',           texto: 'Travamentos em reuniões, streaming interrompido, dispositivos caindo. Uma rede bem estruturada resolve de vez.' },
        { icone: '🏡', titulo: 'Tecnologia valoriza o imóvel',                    texto: 'Automação e infraestrutura de qualidade agregam valor real na hora de vender ou alugar. É investimento, não custo.' },
      ]

  dores.forEach((d, i) => {
    y = checkY(doc, y, 22)
    if (i % 2 === 0) { fundo(doc, [250, 250, 250]); doc.rect(VM, y - 4, w - VM * 2, 20, 'F') }
    fundo(doc, VERM); doc.rect(VM, y - 4, 2, 20, 'F')
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); cor(doc, ESCURO)
    doc.text(`${d.icone}  ${d.titulo}`, VM + 5, y + 3)
    doc.setFont('helvetica', 'normal'); cor(doc, CINZA)
    const linhas = doc.splitTextToSize(d.texto, w - VM * 2 - 8)
    linhas.forEach((l: string, li: number) => doc.text(l, VM + 5, y + 9 + li * 4.5))
    y += 24
  })

  return y + 4
}

// ─────────────────────────────────────────────────────────────
//  BLOCO: RESUMO DA SOLUÇÃO
// ─────────────────────────────────────────────────────────────

function blocoResumo(doc: jsPDF, y: number, titulo: string, descricao: string, tipo: 'negociacao' | 'recorrente'): number {
  const w = W(doc)
  y = checkY(doc, y, 40)

  fundo(doc, ESCURO); doc.rect(VM, y, 3, 7, 'F')
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); cor(doc, ESCURO)
  doc.text(tipo === 'recorrente' ? 'O QUE ESTÁ INCLUÍDO NO SEU PLANO' : 'A SOLUÇÃO PARA VOCÊ', VM + 6, y + 5.5)
  y += 13

  // Título do projeto em destaque
  fundo(doc, VERM); doc.rect(VM, y, w - VM * 2, 12, 'F')
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); cor(doc, BRANCO)
  doc.text(titulo || (tipo === 'recorrente' ? 'Plano de Manutenção' : 'Projeto personalizado'), VM + 5, y + 8.5)
  y += 17

  if (descricao) {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); cor(doc, CINZA)
    const linhas = doc.splitTextToSize(descricao, w - VM * 2)
    linhas.forEach((l: string, li: number) => { y = checkY(doc, y, 6); doc.text(l, VM, y); y += 5.5 })
    y += 3
  }

  return y
}

// ─────────────────────────────────────────────────────────────
//  BLOCO: INVESTIMENTO  (valor percebido antes do número)
// ─────────────────────────────────────────────────────────────

function blocoInvestimento(doc: jsPDF, y: number, valor: number, tipo: 'negociacao' | 'recorrente', extra?: string): number {
  const w = W(doc)
  y = checkY(doc, y, 50)

  fundo(doc, ESCURO); doc.rect(VM, y, 3, 7, 'F')
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); cor(doc, ESCURO)
  doc.text('INVESTIMENTO', VM + 6, y + 5.5)
  y += 13

  // Frase de reframe de preço
  doc.setFontSize(9); doc.setFont('helvetica', 'italic'); cor(doc, CINZA)
  const frase = tipo === 'recorrente'
    ? 'Menos do que um café por dia para manter sua proteção sempre funcionando.'
    : 'Um investimento que você verá no valor do seu imóvel e sentirá no conforto do dia a dia.'
  doc.text(frase, VM, y); y += 8

  // Box de valor destacado
  fundo(doc, VERM); doc.rect(VM, y, w - VM * 2, 28, 'F')
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); cor(doc, [255, 200, 200])
  doc.text(tipo === 'recorrente' ? 'VALOR MENSAL DO PLANO' : 'INVESTIMENTO TOTAL DO PROJETO', VM + 6, y + 9)
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); cor(doc, BRANCO)
  doc.text(`R$ ${fmt(valor || 0)}`, VM + 6, y + 22)
  y += 34

  if (extra) {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); cor(doc, CINZA)
    doc.text(extra, VM, y); y += 7
  }

  return y
}

// ─────────────────────────────────────────────────────────────
//  BLOCO: BENEFÍCIOS CONCRETOS  (prova antes da objeção)
// ─────────────────────────────────────────────────────────────

function blocoBeneficios(doc: jsPDF, y: number, tipo: 'negociacao' | 'recorrente'): number {
  const w = W(doc)
  y = checkY(doc, y, 55)

  fundo(doc, ESCURO); doc.rect(VM, y, 3, 7, 'F')
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); cor(doc, ESCURO)
  doc.text('O QUE VOCÊ GANHA COM ISSO', VM + 6, y + 5.5)
  y += 13

  const beneficios = tipo === 'recorrente'
    ? [
        { check: '✔', texto: 'Monitoramento contínuo dos seus equipamentos' },
        { check: '✔', texto: 'Visita técnica preventiva incluída no plano' },
        { check: '✔', texto: 'Suporte remoto com resposta em até 24h' },
        { check: '✔', texto: 'Atualizações de firmware e configurações' },
        { check: '✔', texto: 'Prioridade no atendimento em caso de falha' },
        { check: '✔', texto: 'Relatório mensal do estado do sistema' },
      ]
    : [
        { check: '✔', texto: 'Câmeras e alarmes monitorados de qualquer lugar pelo celular' },
        { check: '✔', texto: 'Wi-fi de alta performance em todos os cômodos, sem pontos cegos' },
        { check: '✔', texto: 'Automação que facilita a rotina e reduz consumo de energia' },
        { check: '✔', texto: 'Instalação profissional certificada, sem transtorno na obra' },
        { check: '✔', texto: 'Suporte técnico incluso e garantia de 12 meses' },
        { check: '✔', texto: 'Imóvel valorizado com tecnologia real e comprovada' },
      ]

  const col = (w - VM * 2 - 6) / 2
  beneficios.forEach((b, i) => {
    const bx = i % 2 === 0 ? VM : VM + col + 6
    const row = Math.floor(i / 2)
    const by = y + row * 11
    y = checkY(doc, by + 3, 11)
    fundo(doc, [235, 250, 240]); doc.rect(bx, by - 3, col, 9, 'F')
    fundo(doc, VERDE); doc.rect(bx, by - 3, 2, 9, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); cor(doc, VERDE)
    doc.text(b.check, bx + 4, by + 3)
    doc.setFont('helvetica', 'normal'); cor(doc, ESCURO)
    const t = doc.splitTextToSize(b.texto, col - 12)
    doc.text(t[0], bx + 10, by + 3)
  })

  return y + Math.ceil(beneficios.length / 2) * 11 + 6
}

// ─────────────────────────────────────────────────────────────
//  BLOCO: GARANTIA  (elimina medo de comprar)
// ─────────────────────────────────────────────────────────────

function blocoGarantia(doc: jsPDF, y: number, tipo: 'negociacao' | 'recorrente'): number {
  const w = W(doc)
  y = checkY(doc, y, 40)

  fundo(doc, ESCURO); doc.rect(VM, y, 3, 7, 'F')
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); cor(doc, ESCURO)
  doc.text('GARANTIA E SEGURANÇA', VM + 6, y + 5.5)
  y += 12

  fundo(doc, [240, 248, 243]); doc.rect(VM, y, w - VM * 2, tipo === 'recorrente' ? 28 : 22, 'F')
  fundo(doc, VERDE); doc.rect(VM, y, 3, tipo === 'recorrente' ? 28 : 22, 'F')

  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); cor(doc, ESCURO)
  const itens = tipo === 'recorrente'
    ? [
        '✔  Contrato com prazo e escopo definidos — sem surpresas',
        '✔  Cancelamento facilitado após carência mínima',
        '✔  Equipe certificada e treinada pelos fabricantes',
        '✔  Histórico completo de atendimentos e visitas',
      ]
    : [
        '✔  Garantia de 12 meses em equipamentos e mão de obra',
        '✔  Profissionais certificados pelos fabricantes',
        '✔  Documentação completa entregue na finalização',
      ]

  itens.forEach((item, i) => { doc.text(item, VM + 6, y + 7 + i * 6.5) })
  y += (itens.length * 6.5) + 12

  return y
}

// ─────────────────────────────────────────────────────────────
//  BLOCO: DADOS EXTRAS (tel, email, dia vencimento etc.)
// ─────────────────────────────────────────────────────────────

function blocoDadosCliente(doc: jsPDF, y: number, neg: Negociacao | Recorrente, tipo: 'negociacao' | 'recorrente'): number {
  y = checkY(doc, y, 30)
  const w = W(doc)

  fundo(doc, CINZA_CLARO); doc.rect(VM, y, w - VM * 2, tipo === 'recorrente' ? 22 : 28, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); cor(doc, CINZA)
  doc.text('DADOS DO CONTRATO', VM + 4, y + 6)
  doc.setFont('helvetica', 'normal'); cor(doc, ESCURO)

  if (tipo === 'negociacao') {
    const n = neg as Negociacao
    doc.text(`Cliente: ${n.clienteNome || '—'}`, VM + 4, y + 13)
    doc.text(`Telefone: ${n.clienteTel || '—'}   ·   E-mail: ${n.clienteEmail || '—'}`, VM + 4, y + 19)
    doc.text(`Código: ${neg.codigo}   ·   Data: ${fmtDate(neg.data)}`, VM + 4, y + 25)
    y += 32
  } else {
    const r = neg as Recorrente
    doc.text(`Cliente: ${r.clienteNome || '—'}   ·   Vencimento todo dia: ${r.dia || '—'}`, VM + 4, y + 13)
    doc.text(`Código: ${neg.codigo}   ·   Início: ${fmtDate(neg.data)}`, VM + 4, y + 19)
    y += 26
  }

  return y
}

// ─────────────────────────────────────────────────────────────
//  BLOCO: PRÓXIMOS PASSOS  (reduz atrito para fechar)
// ─────────────────────────────────────────────────────────────

function blocoProximosPassos(doc: jsPDF, y: number, tipo: 'negociacao' | 'recorrente'): number {
  const w = W(doc)
  y = checkY(doc, y, 50)

  fundo(doc, ESCURO); doc.rect(VM, y, 3, 7, 'F')
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); cor(doc, ESCURO)
  doc.text('COMO AVANÇAR', VM + 6, y + 5.5)
  y += 13

  const passos = tipo === 'recorrente'
    ? ['Confirme seu interesse por WhatsApp', 'Assinamos o contrato digitalmente', 'Agendamos a primeira visita técnica', 'Seu sistema entra em cobertura imediata']
    : ['Confirme a proposta por WhatsApp',    'Assinamos o contrato digitalmente',  'Agendamos a visita de instalação',     'Entregamos tudo funcionando com garantia']

  const bw = (w - VM * 2 - (passos.length - 1) * 3) / passos.length
  passos.forEach((p, i) => {
    const bx = VM + i * (bw + 3)
    fundo(doc, CINZA_CLARO); doc.rect(bx, y, bw, 26, 'F')
    fundo(doc, VERM);        doc.rect(bx, y, bw, 3,  'F')
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); cor(doc, VERM)
    doc.text(`0${i + 1}`, bx + bw / 2, y + 12, { align: 'center' })
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); cor(doc, ESCURO)
    const linhas = doc.splitTextToSize(p, bw - 4)
    linhas.forEach((l: string, li: number) => doc.text(l, bx + bw / 2, y + 18 + li * 3.8, { align: 'center' }))
  })

  return y + 33
}

// ─────────────────────────────────────────────────────────────
//  BLOCO: CTA FINAL  (fechamento com urgência e emoção)
// ─────────────────────────────────────────────────────────────

function blocoCTA(doc: jsPDF, y: number, telefone: string, tipo: 'negociacao' | 'recorrente'): number {
  const w = W(doc)
  y = checkY(doc, y, 48)

  fundo(doc, VERM); doc.rect(VM, y, w - VM * 2, 44, 'F')

  doc.setFontSize(15); doc.setFont('helvetica', 'bold'); cor(doc, BRANCO)
  const titulo = tipo === 'recorrente'
    ? 'Seu sistema merece atenção contínua.'
    : 'Pronto para proteger e valorizar seu imóvel?'
  doc.text(titulo, w / 2, y + 13, { align: 'center' })

  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); cor(doc, [255, 210, 210])
  const sub = tipo === 'recorrente'
    ? 'Confirme agora e nossa equipe agenda sua primeira visita em até 48h.'
    : 'Confirme esta proposta e nossa equipe entra em contato em até 24h.'
  doc.text(sub, w / 2, y + 22, { align: 'center', maxWidth: w - VM * 2 - 20 })

  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); cor(doc, BRANCO)
  doc.text(`📱  ${telefone || 'Fale conosco pelo WhatsApp'}`, w / 2, y + 33, { align: 'center' })

  // Validade como urgência
  const validade = new Date(); validade.setDate(validade.getDate() + 7)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); cor(doc, [255, 180, 180])
  doc.text(`⏳  Proposta válida até ${validade.toLocaleDateString('pt-BR')}`, w / 2, y + 41, { align: 'center' })

  return y + 50
}

// ─────────────────────────────────────────────────────────────
//  BLOCO: OBSERVAÇÕES  (só se tiver conteúdo)
// ─────────────────────────────────────────────────────────────

function blocoObs(doc: jsPDF, y: number, obs: string): number {
  if (!obs) return y
  const w = W(doc)
  y = checkY(doc, y, 24)

  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); cor(doc, CINZA)
  doc.text('OBSERVAÇÕES', VM, y); y += 6
  doc.setFont('helvetica', 'normal'); cor(doc, CINZA)
  const linhas = doc.splitTextToSize(obs, w - VM * 2)
  linhas.forEach((l: string) => { y = checkY(doc, y, 6); doc.text(l, VM, y); y += 5 })
  return y + 4
}

// ─────────────────────────────────────────────────────────────
//  FUNÇÃO PRINCIPAL EXPORTADA
// ─────────────────────────────────────────────────────────────

export function gerarPropostaPDF(
  neg: Negociacao | Recorrente,
  tipo: 'negociacao' | 'recorrente' = 'negociacao'
) {
  // Lê configurações salvas em Configurações > Padrão de proposta
  const cfg      = DB.getObj<PropConfig>('propConfig')
  const empresa  = cfg.empresa  || 'GRUPO AST'
  const telefone = cfg.tel      || '(81) 4042.3084'

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setFont('helvetica', 'normal')

  const clienteNome = 'clienteNome' in neg ? neg.clienteNome : ''
  const titulo      = 'titulo' in neg
    ? (neg as Negociacao).titulo
    : ('produto' in neg ? (neg as Recorrente).produto : '')
  const obs         = neg.obs || ''
  const extra       = tipo === 'recorrente'
    ? `Vencimento todo dia ${(neg as Recorrente).dia || '—'} · Início: ${fmtDate(neg.data)}`
    : (neg as Negociacao).clienteTel
      ? `Formas de pagamento: consulte nosso time  ·  Tel: ${(neg as Negociacao).clienteTel}`
      : ''

  // ── Ordem estratégica de neurovendas ─────────────────────────────────────
  // 1. CAPA          → Primeira impressão, nome do cliente em destaque
  let y = blocoCapa(doc, empresa, clienteNome, neg.codigo, fmtDate(neg.data))

  // 2. DOR → SOLUÇÃO → Ativa o problema antes de mostrar o preço
  y = blocoDorSolucao(doc, y, tipo)

  // 3. RESUMO        → Mostra o que será feito, de forma clara e valorizada
  y = blocoResumo(doc, y, titulo, obs, tipo)

  // 4. BENEFÍCIOS    → Benefício concreto antes de qualquer dado técnico
  y = blocoBeneficios(doc, y, tipo)

  // 5. INVESTIMENTO  → Preço só aparece DEPOIS que o cliente já viu o valor
  y = blocoInvestimento(doc, y, neg.valor || 0, tipo, extra)

  // 6. GARANTIA      → Elimina o medo de comprar
  y = blocoGarantia(doc, y, tipo)

  // 7. PRÓXIMOS PASSOS → Torna o sim fácil
  y = blocoProximosPassos(doc, y, tipo)

  // 8. CTA FINAL     → Urgência + contato direto
  y = blocoCTA(doc, y, telefone, tipo)

  // 9. DADOS DO CONTRATO → Informação técnica no final, não no início
  blocoDadosCliente(doc, y, neg, tipo)

  // Rodapé em todas as páginas
  aplicarRodape(doc, empresa)

  doc.save(`Proposta_AST_${neg.codigo}.pdf`)
}

// ─────────────────────────────────────────────────────────────
//  ENVIO VIA WHATSAPP  (sem alteração)
// ─────────────────────────────────────────────────────────────

export function enviarPropostaWhatsApp(neg: Negociacao | Recorrente) {
  const tel      = ('clienteTel' in neg ? neg.clienteTel : '') || ''
  const cleanTel = tel.replace(/\D/g, '')
  const fullTel  = cleanTel.startsWith('55') ? cleanTel : '55' + cleanTel

  const titulo = 'titulo' in neg
    ? (neg as Negociacao).titulo
    : ('produto' in neg ? (neg as Recorrente).produto : '')

  const cfg     = DB.getObj<PropConfig>('propConfig')
  const empresa = cfg.empresa || 'Grupo AST'

  const msg = encodeURIComponent(
    `Olá, ${('clienteNome' in neg ? neg.clienteNome : '') || ''}! 👋\n\n` +
    `Segue a proposta da *${empresa}* referente a "${titulo}" (${neg.codigo}).\n\n` +
    `💰 Valor: R$ ${neg.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}\n\n` +
    `Qualquer dúvida, estou à disposição. Aguardo seu retorno! 🚀`
  )

  window.open(`https://wa.me/${fullTel}?text=${msg}`, '_blank')
}
