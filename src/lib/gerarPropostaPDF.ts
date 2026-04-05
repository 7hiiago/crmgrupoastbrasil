import jsPDF from 'jspdf'

// ─────────────────────────────────────────────────────────────
//  HELPERS de layout
// ─────────────────────────────────────────────────────────────

const PAGE_W   = 210   // A4 largura (mm)
const MARGIN   = 18    // margem lateral
const CONTENT  = PAGE_W - MARGIN * 2   // 174 mm

// Cores corporativas AST (RGB)
const COR_PRIMARIA  = [192,  33,  38] as [number,number,number]  // vermelho AST
const COR_ESCURA    = [ 30,  30,  30] as [number,number,number]  // quase-preto
const COR_CINZA     = [100, 100, 100] as [number,number,number]
const COR_SUAVE     = [240, 240, 240] as [number,number,number]
const COR_BRANCA    = [255, 255, 255] as [number,number,number]
const COR_VERDE     = [ 34, 139,  34] as [number,number,number]

function rgb(doc: jsPDF, cor: [number,number,number]) {
  doc.setTextColor(...cor)
}

function drawRect(doc: jsPDF, x: number, y: number, w: number, h: number, cor: [number,number,number], filled = true) {
  doc.setDrawColor(...cor)
  if (filled) doc.setFillColor(...cor)
  filled ? doc.rect(x, y, w, h, 'F') : doc.rect(x, y, w, h, 'S')
}

/** Adiciona nova página e retorna y = 20 */
function novaPagina(doc: jsPDF): number {
  doc.addPage()
  return 20
}

/** Verifica se precisa de nova página e avança */
function checkY(doc: jsPDF, y: number, extra = 20): number {
  if (y + extra > 270) return novaPagina(doc)
  return y
}

/** Linha horizontal decorativa */
function hrLine(doc: jsPDF, y: number, cor = COR_PRIMARIA) {
  drawRect(doc, MARGIN, y, CONTENT, 0.5, cor)
  return y + 3
}

/** Título de seção com barra lateral vermelha */
function sectionTitle(doc: jsPDF, y: number, texto: string): number {
  y = checkY(doc, y, 14)
  drawRect(doc, MARGIN, y, 3, 8, COR_PRIMARIA)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  rgb(doc, COR_ESCURA)
  doc.text(texto.toUpperCase(), MARGIN + 6, y + 6)
  doc.setFont('helvetica', 'normal')
  return y + 13
}

/** Texto corrido com quebra automática, retorna novo y */
function paragrafo(doc: jsPDF, y: number, texto: string, tamanho = 10, cor = COR_CINZA): number {
  doc.setFontSize(tamanho)
  rgb(doc, cor)
  const linhas = doc.splitTextToSize(texto, CONTENT)
  linhas.forEach((linha: string) => {
    y = checkY(doc, y, 6)
    doc.text(linha, MARGIN, y)
    y += 5.5
  })
  return y
}

/** Badge colorido (pill) */
function badge(doc: jsPDF, x: number, y: number, texto: string, cor = COR_PRIMARIA) {
  const pad = 3
  const tw  = doc.getTextWidth(texto) + pad * 2
  drawRect(doc, x, y - 4, tw, 6, cor)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  rgb(doc, COR_BRANCA)
  doc.text(texto, x + pad, y)
  doc.setFont('helvetica', 'normal')
}

/** Rodapé em todas as páginas */
function rodapePaginas(doc: jsPDF, nomeCliente: string) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawRect(doc, 0, 283, PAGE_W, 14, COR_PRIMARIA)
    doc.setFontSize(8)
    rgb(doc, COR_BRANCA)
    doc.text(`Proposta para ${nomeCliente}  ·  Grupo AST Brasil`, MARGIN, 291)
    doc.text(`Página ${i} / ${total}`, PAGE_W - MARGIN, 291, { align: 'right' })
  }
}

// ─────────────────────────────────────────────────────────────
//  SEÇÕES
// ─────────────────────────────────────────────────────────────

/** 1. CAPA — primeira impressão = percepção de valor */
function secaoCapa(doc: jsPDF, n: any): number {
  // Fundo superior vermelho
  drawRect(doc, 0, 0, PAGE_W, 90, COR_PRIMARIA)

  // Logotipo / nome empresa (substitua por doc.addImage se tiver logo)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  rgb(doc, [255, 220, 220])
  doc.text('GRUPO AST BRASIL', MARGIN, 18)

  // Título principal
  doc.setFontSize(26)
  rgb(doc, COR_BRANCA)
  doc.text('PROPOSTA', MARGIN, 44)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'normal')
  doc.text('COMERCIAL', MARGIN, 55)

  // Subtítulo / promessa
  doc.setFontSize(11)
  rgb(doc, [255, 200, 200])
  doc.text('Tecnologia e conforto integrados ao seu ambiente', MARGIN, 68)

  // Bloco de dados do cliente (abaixo do vermelho)
  let y = 102

  drawRect(doc, MARGIN, 88, CONTENT, 38, COR_SUAVE)
  doc.setFontSize(9)
  rgb(doc, COR_CINZA)
  doc.setFont('helvetica', 'bold')
  doc.text('PREPARADO PARA', MARGIN + 6, 97)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  rgb(doc, COR_ESCURA)
  doc.text(n.clienteNome || 'Cliente', MARGIN + 6, 106)

  doc.setFontSize(9)
  rgb(doc, COR_CINZA)
  doc.text(`Projeto: ${n.titulo || '—'}`, MARGIN + 6, 113)
  doc.text(`Código: ${n.codigo || n.id}   ·   Data: ${new Date().toLocaleDateString('pt-BR')}`, MARGIN + 6, 119)

  // Status do funil como badge
  if (n.status) {
    badge(doc, MARGIN + 6, y + 6, n.status.toUpperCase())
  }

  return y + 20
}

/** 2. RESUMO EXECUTIVO — o cliente entende em 30 segundos */
function secaoResumo(doc: jsPDF, y: number, n: any): number {
  y = novaPagina(doc)
  y = sectionTitle(doc, y, '01 · Resumo Executivo')

  const resumo = n.resumo ||
    `Esta proposta apresenta uma solução completa de automação e tecnologia para o projeto "${n.titulo}". ` +
    `Desenvolvemos um plano personalizado que combina conforto, segurança e praticidade, ` +
    `entregando o máximo de valor com instalação profissional e suporte contínuo.`

  y = paragrafo(doc, y, resumo, 11, COR_ESCURA)
  y += 4

  // Três pilares rápidos em caixas lado a lado
  const boxes = [
    { emoji: '🏠', titulo: 'Conforto',   sub: 'Ambientes que funcionam por você' },
    { emoji: '🔒', titulo: 'Segurança',  sub: 'Proteção para quem você ama'      },
    { emoji: '📈', titulo: 'Valorização',sub: 'Imóvel com mais valor de mercado' },
  ]
  const bw = (CONTENT - 8) / 3
  boxes.forEach((b, i) => {
    const bx = MARGIN + i * (bw + 4)
    drawRect(doc, bx, y, bw, 26, COR_SUAVE)
    drawRect(doc, bx, y, bw, 3, COR_PRIMARIA)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    rgb(doc, COR_ESCURA)
    doc.text(b.titulo, bx + 4, y + 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    rgb(doc, COR_CINZA)
    const sub = doc.splitTextToSize(b.sub, bw - 6)
    sub.forEach((l: string, li: number) => doc.text(l, bx + 4, y + 16 + li * 4.5))
  })

  return y + 34
}

/** 3. SOLUÇÃO POR AMBIENTE — benefício antes da técnica */
function secaoSolucoes(doc: jsPDF, y: number, proposta: any[]): number {
  if (!proposta || proposta.length === 0) return y

  y = novaPagina(doc)
  y = sectionTitle(doc, y, '02 · Solução por Ambiente')

  // Benefícios gerais primeiro
  y = paragrafo(doc, y,
    'Cada ambiente foi pensado para maximizar conforto e funcionalidade. ' +
    'Veja abaixo as soluções personalizadas para o seu projeto:',
    10, COR_CINZA)
  y += 4

  proposta.forEach((secao: any) => {
    y = checkY(doc, y, 40)

    // Cabeçalho do ambiente
    drawRect(doc, MARGIN, y, CONTENT, 10, COR_PRIMARIA)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    rgb(doc, COR_BRANCA)
    doc.text(secao.nome || 'Ambiente', MARGIN + 5, y + 7)
    doc.setFont('helvetica', 'normal')
    y += 13

    // Benefício do ambiente (antes dos itens técnicos)
    const beneficio = secao.beneficio ||
      'Soluções integradas para mais praticidade, economia de energia e bem-estar no dia a dia.'
    y = paragrafo(doc, y, `✦  ${beneficio}`, 9, COR_PRIMARIA)
    y += 2

    // Tabela de itens
    if (secao.itens?.length) {
      // Cabeçalho da tabela
      drawRect(doc, MARGIN, y, CONTENT, 7, [210, 210, 210])
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      rgb(doc, COR_ESCURA)
      doc.text('PRODUTO / SOLUÇÃO', MARGIN + 3, y + 5)
      doc.text('QTD', MARGIN + 105, y + 5, { align: 'right' })
      doc.text('UNIT.', MARGIN + 130, y + 5, { align: 'right' })
      doc.text('TOTAL', MARGIN + CONTENT - 2, y + 5, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      y += 9

      let totalSecao = 0
      secao.itens.forEach((item: any, idx: number) => {
        y = checkY(doc, y, 8)
        const isOdd = idx % 2 === 0
        if (isOdd) drawRect(doc, MARGIN, y - 4, CONTENT, 7, [248, 248, 248])

        const totalItem = (item.qtd || 1) * (item.valorUnd || 0)
        totalSecao += totalItem

        doc.setFontSize(9)
        rgb(doc, COR_ESCURA)
        // Nome truncado para caber
        const nomeItem = doc.splitTextToSize(item.nome || '—', 95)[0]
        doc.text(nomeItem, MARGIN + 3, y)
        rgb(doc, COR_CINZA)
        doc.text(String(item.qtd || 1), MARGIN + 105, y, { align: 'right' })
        doc.text(`R$ ${(item.valorUnd || 0).toFixed(2)}`, MARGIN + 130, y, { align: 'right' })
        doc.setFont('helvetica', 'bold')
        rgb(doc, COR_ESCURA)
        doc.text(`R$ ${totalItem.toFixed(2)}`, MARGIN + CONTENT - 2, y, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        y += 7
      })

      // Subtotal do ambiente
      drawRect(doc, MARGIN, y, CONTENT, 8, COR_PRIMARIA)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      rgb(doc, COR_BRANCA)
      doc.text('SUBTOTAL DO AMBIENTE', MARGIN + 3, y + 5.5)
      doc.text(`R$ ${totalSecao.toFixed(2)}`, MARGIN + CONTENT - 2, y + 5.5, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      y += 12
    }
    y += 4
  })

  return y
}

/** 4. INVESTIMENTO — valor percebido antes do número */
function secaoInvestimento(doc: jsPDF, y: number, n: any, proposta: any[]): number {
  y = checkY(doc, y, 60)
  y = sectionTitle(doc, y, '03 · Investimento')

  // Valor percebido primeiro
  y = paragrafo(doc, y,
    'Você está investindo em qualidade de vida, segurança e valorização do seu patrimônio. ' +
    'Confira abaixo o investimento completo para tornar este projeto realidade:',
    10, COR_CINZA)
  y += 4

  // Tabela de recorrência (se houver)
  if (n.recorrencia || n.planoMensal) {
    drawRect(doc, MARGIN, y, CONTENT, 8, [230, 240, 255])
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    rgb(doc, [30, 60, 120])
    doc.text('📋  PLANO DE RECORRÊNCIA / MANUTENÇÃO', MARGIN + 4, y + 5.5)
    doc.setFont('helvetica', 'normal')
    y += 11

    const rec = n.recorrencia || n.planoMensal
    if (typeof rec === 'object') {
      const linhasRec: string[][] = [
        ['Periodicidade', rec.periodicidade || '—'],
        ['Serviços inclusos', rec.servicos || 'Manutenção preventiva e suporte técnico'],
        ['Valor mensal', rec.valorMensal ? `R$ ${Number(rec.valorMensal).toFixed(2)}` : '—'],
        ['Vigência', rec.vigencia || '12 meses'],
      ]
      linhasRec.forEach(([k, v], i) => {
        y = checkY(doc, y, 7)
        if (i % 2 === 0) drawRect(doc, MARGIN, y - 4, CONTENT, 7, [248, 248, 248])
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        rgb(doc, COR_ESCURA)
        doc.text(k, MARGIN + 3, y)
        doc.setFont('helvetica', 'normal')
        rgb(doc, COR_CINZA)
        doc.text(v, MARGIN + 70, y)
        y += 7
      })
    } else {
      y = paragrafo(doc, y, String(rec), 9, COR_CINZA)
    }
    y += 4
  }

  // Resumo por ambiente
  if (proposta?.length) {
    drawRect(doc, MARGIN, y, CONTENT, 7, [220, 220, 220])
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    rgb(doc, COR_ESCURA)
    doc.text('AMBIENTE', MARGIN + 3, y + 5)
    doc.text('VALOR', MARGIN + CONTENT - 2, y + 5, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 9

    let grandTotal = 0
    proposta.forEach((secao: any, idx: number) => {
      y = checkY(doc, y, 8)
      const sub = secao.itens?.reduce((a: number, i: any) => a + (i.qtd || 1) * (i.valorUnd || 0), 0) || 0
      grandTotal += sub
      if (idx % 2 === 0) drawRect(doc, MARGIN, y - 4, CONTENT, 7, [248, 248, 248])
      doc.setFontSize(9)
      rgb(doc, COR_ESCURA)
      doc.text(secao.nome || 'Ambiente', MARGIN + 3, y)
      doc.text(`R$ ${sub.toFixed(2)}`, MARGIN + CONTENT - 2, y, { align: 'right' })
      y += 7
    })

    y += 2
    hrLine(doc, y, COR_PRIMARIA)
    y += 4
  }

  // Box de total destacado
  drawRect(doc, MARGIN, y, CONTENT, 22, COR_PRIMARIA)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  rgb(doc, [255, 220, 220])
  doc.text('INVESTIMENTO TOTAL DO PROJETO', MARGIN + 5, y + 9)
  doc.setFontSize(16)
  rgb(doc, COR_BRANCA)
  doc.text(
    `R$ ${Number(n.valor || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`,
    MARGIN + CONTENT - 5, y + 16, { align: 'right' }
  )
  doc.setFont('helvetica', 'normal')
  y += 28

  // Condições de pagamento (se houver)
  if (n.condicaoPagamento || n.formaPagamento) {
    doc.setFontSize(9)
    rgb(doc, COR_CINZA)
    doc.text(`💳  Condições: ${n.condicaoPagamento || n.formaPagamento}`, MARGIN, y)
    y += 7
  }

  return y
}

/** 5. GARANTIA — elimina objeções */
function secaoGarantia(doc: jsPDF, y: number, n: any): number {
  y = checkY(doc, y, 50)
  y = sectionTitle(doc, y, '04 · Garantia e Suporte')

  const itensGarantia = n.garantia?.itens || [
    { icone: '✔', texto: 'Garantia de 12 meses em equipamentos e instalação' },
    { icone: '✔', texto: 'Suporte técnico remoto incluso durante a vigência' },
    { icone: '✔', texto: 'Mão de obra certificada com profissionais especializados' },
    { icone: '✔', texto: 'Visita técnica de comissionamento após conclusão da obra' },
    { icone: '✔', texto: 'Documentação completa (projeto, manuais e certificados)' },
  ]

  drawRect(doc, MARGIN, y, CONTENT, itensGarantia.length * 9 + 6, COR_SUAVE)
  drawRect(doc, MARGIN, y, 3, itensGarantia.length * 9 + 6, COR_VERDE)
  y += 6

  itensGarantia.forEach((g: any) => {
    y = checkY(doc, y, 9)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    rgb(doc, COR_VERDE)
    doc.text(g.icone || '✔', MARGIN + 5, y)
    doc.setFont('helvetica', 'normal')
    rgb(doc, COR_ESCURA)
    doc.text(g.texto, MARGIN + 12, y)
    y += 9
  })

  return y + 6
}

/** 6. PRÓXIMOS PASSOS — reduz fricção */
function secaoProximosPassos(doc: jsPDF, y: number, n: any): number {
  y = checkY(doc, y, 55)
  y = sectionTitle(doc, y, '05 · Próximos Passos')

  const passos = n.proximosPassos || [
    { num: '01', acao: 'Aprovação da proposta',       detalhe: 'Confirme para reservarmos sua agenda'      },
    { num: '02', acao: 'Assinatura do contrato',      detalhe: 'Processo 100% digital, rápido e seguro'    },
    { num: '03', acao: 'Agendamento de visita',       detalhe: 'Definimos a data ideal para você'          },
    { num: '04', acao: 'Início da execução',          detalhe: 'Equipe certificada, prazo garantido'       },
    { num: '05', acao: 'Entrega e comissionamento',   detalhe: 'Tudo funcionando e documentado'            },
  ]

  const pw = (CONTENT - (passos.length - 1) * 3) / passos.length
  passos.forEach((p: any, i: number) => {
    const px = MARGIN + i * (pw + 3)
    y = checkY(doc, y, 30)

    drawRect(doc, px, y, pw, 24, COR_SUAVE)
    drawRect(doc, px, y, pw, 3, COR_PRIMARIA)

    // Número do passo
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    rgb(doc, COR_PRIMARIA)
    doc.text(p.num, px + pw / 2, y + 11, { align: 'center' })

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    rgb(doc, COR_ESCURA)
    const acao = doc.splitTextToSize(p.acao, pw - 4)
    acao.forEach((l: string, li: number) => doc.text(l, px + pw / 2, y + 17 + li * 3.5, { align: 'center' }))
  })

  return y + 32
}

/** 7. CTA FINAL — fechamento direto e emocional */
function secaoCTA(doc: jsPDF, y: number, n: any): number {
  y = checkY(doc, y, 55)

  // Fundo destacado
  drawRect(doc, MARGIN, y, CONTENT, 52, COR_PRIMARIA)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  rgb(doc, COR_BRANCA)
  doc.text('Pronto para transformar seu ambiente?', PAGE_W / 2, y + 14, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  rgb(doc, [255, 200, 200])
  doc.text(
    'Basta confirmar esta proposta e nossa equipe entra em contato em até 24 horas.',
    PAGE_W / 2, y + 23, { align: 'center', maxWidth: CONTENT - 20 }
  )

  // Dados de contato
  const contato = n.vendedorContato || 'Fale conosco pelo WhatsApp'
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  rgb(doc, COR_BRANCA)
  doc.text(`📱  ${contato}`, PAGE_W / 2, y + 36, { align: 'center' })

  // Validade da proposta
  const dataValidade = n.validade || (() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toLocaleDateString('pt-BR')
  })()
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  rgb(doc, [255, 180, 180])
  doc.text(`⏳  Esta proposta é válida até ${dataValidade}`, PAGE_W / 2, y + 46, { align: 'center' })

  return y + 58
}

// ─────────────────────────────────────────────────────────────
//  FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

export function gerarPropostaPDF(n: any) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setFont('helvetica', 'normal')

  // Carrega dados salvos da proposta (ambientes + itens)
  let proposta: any[] = []
  try {
    proposta = JSON.parse(localStorage.getItem(`proposta_${n.id}`) || '[]')
  } catch {
    proposta = []
  }

  // ── 1. CAPA ──────────────────────────────────────────────
  let y = secaoCapa(doc, n)

  // ── 2. RESUMO ────────────────────────────────────────────
  y = secaoResumo(doc, y, n)

  // ── 3. SOLUÇÃO POR AMBIENTE ───────────────────────────────
  y = secaoSolucoes(doc, y, proposta)

  // ── 4. INVESTIMENTO ──────────────────────────────────────
  y = secaoInvestimento(doc, y, n, proposta)

  // ── 5. GARANTIA ──────────────────────────────────────────
  y = secaoGarantia(doc, y, n)

  // ── 6. PRÓXIMOS PASSOS ───────────────────────────────────
  y = secaoProximosPassos(doc, y, n)

  // ── 7. CTA FINAL ─────────────────────────────────────────
  secaoCTA(doc, y, n)

  // Rodapé em todas as páginas
  rodapePaginas(doc, n.clienteNome || 'Cliente')

  // Salva o arquivo
  const codigo = n.codigo || n.id || 'proposta'
  doc.save(`Proposta_AST_${codigo}.pdf`)
}

// ─────────────────────────────────────────────────────────────
//  CAMPOS EXTRAS SUPORTADOS NO OBJETO `n` (negociação)
// ─────────────────────────────────────────────────────────────
//
//  n.clienteNome        — nome do cliente
//  n.titulo             — título do projeto
//  n.codigo             — código da negociação
//  n.id                 — id para buscar proposta no localStorage
//  n.valor              — valor total (number)
//  n.status             — status do funil (ex: "Em negociação")
//  n.resumo             — texto de resumo executivo personalizado
//  n.condicaoPagamento  — ex: "3x sem juros no cartão"
//  n.formaPagamento     — alternativo a condicaoPagamento
//  n.vendedorContato    — ex: "(81) 99999-9999 – João"
//  n.validade           — data limite da proposta (string pt-BR)
//  n.recorrencia        — objeto { periodicidade, servicos, valorMensal, vigencia }
//  n.planoMensal        — alternativo a recorrencia
//  n.garantia           — objeto { itens: [{ icone, texto }] }
//  n.proximosPassos     — array [{ num, acao, detalhe }]
//
//  localStorage `proposta_${n.id}` — array de seções:
//    [{ nome, beneficio, itens: [{ nome, qtd, valorUnd }] }]
