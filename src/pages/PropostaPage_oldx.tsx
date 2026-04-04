/**
 * PropostaPage.tsx
 * Gerador de Propostas em PDF — Grupo AST
 *
 * INSTALAÇÃO:
 * 1. Copiar para src/pages/PropostaPage.tsx
 * 2. Instalar dependência: npm install html2pdf.js
 * 3. Adicionar ao menu em Layout.tsx:
 *    (não precisa — é acessada de dentro da negociação)
 * 4. No seu Index.tsx / roteador, adicionar:
 *    case 'proposta': return <PropostaPage negociacaoId={currentNegId} onBack={() => navigate('negociacoes')} />;
 *
 * COMO CHAMAR A PÁGINA:
 * Em NegociacaoDetalhes ou similar, adicione um botão:
 *   <button onClick={() => onNavigate('proposta')}>📄 Gerar Proposta</button>
 */

import { DB } from '@/lib/db';
import React, { useState, useRef, useCallback } from 'react';

const salvar = () => {
  DB.set(chaveDB, [cfg]);
  alert('Proposta salva!');
};

// ─── TIPOS ───────────────────────────────────────────────────────────────────

<button
  onClick={salvar}
  className="px-4 py-2 bg-ast-bg3 text-foreground text-sm rounded hover:bg-ast-bg3/80"
>
  💾 Salvar
</button>

const chaveDB = `proposta_${negociacaoId || 'avulsa'}`;

const [cfg, setCfg] = useState<ConfigProposta>(() => {
  try {
    const salvo = DB.get<any>(chaveDB);
    if (salvo && salvo.length > 0) return salvo[0];
  } catch {}
  return configInicial;
});

interface ItemProposta {
  id: string;
  descricao: string;
  qtd: number;
  valorUnd: number;
}

interface SecaoProposta {
  id: string;
  titulo: string;
  descricao: string;
  itens: ItemProposta[];
  servicoValor: number;
}

interface ConfigProposta {
  // Capa
  nomeCliente: string;
  nomeContato: string;
  dataDoc: string;
  logoUrl: string;           // URL ou base64 do logo da empresa emitente
  fundoCapaUrl: string;      // imagem de fundo da capa (base64)
  corPrimaria: string;       // hex
  corTexto: string;          // hex
  orientacao: 'paisagem' | 'retrato';

  // Empresa emitente
  nomeEmpresa: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;

  // Conteúdo
  apresentacao: string;      // texto livre da carta de apresentação
  secoes: SecaoProposta[];

  // Rodapé / Condições
  condicoesPagamento: string;
  validadeProposta: string;
  observacoes: string;

  // Slides extras (imagens de portfólio, clientes etc.)
  slidesExtras: string[];    // array de base64
}

// ─── ESTADO INICIAL ───────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const secaoVazia = (): SecaoProposta => ({
  id: uid(),
  titulo: '',
  descricao: '',
  itens: [],
  servicoValor: 0,
});

const itemVazio = (): ItemProposta => ({
  id: uid(),
  descricao: '',
  qtd: 1,
  valorUnd: 0,
});

const configInicial: ConfigProposta = {
  nomeCliente: '',
  nomeContato: '',
  dataDoc: new Date().toLocaleDateString('pt-BR'),
  logoUrl: '',
  fundoCapaUrl: '',
  corPrimaria: '#E3000F',
  corTexto: '#FFFFFF',
  orientacao: 'paisagem',
  nomeEmpresa: 'GRUPO AST',
  cnpj: '35.794.626/0001-00',
  endereco: 'Av. Adjar da Silva Casé, 800, Indianópolis, Caruaru – PE',
  telefone: '(81) 4042.3084',
  email: 'contato@grupoast.com.br',
  apresentacao: 'Conforme solicitado, segue a proposta detalhada para os serviços descritos abaixo. Estamos à disposição para o esclarecimento de qualquer dúvida ou informação adicional necessária.',
  secoes: [secaoVazia()],
  condicoesPagamento: 'Pagamento em 1+2, sendo o primeiro pagamento correspondente a 50% do valor total do projeto e os pagamentos 2 e 3 correspondentes a 25% do valor total cada um, em 30 e 60 dias respectivamente.',
  validadeProposta: '7 dias',
  observacoes: 'Este orçamento não contempla serviços civis (serralharia, gesso, marcenaria, elétrico, lançamento de cabos e afins). Considerar acréscimo de 8% para emissão de nota no produto e 15% para emissão de nota no serviço.',
  slidesExtras: [],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const toBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

interface Props {
  negociacaoId?: string;
  onBack?: () => void;
}

export default function PropostaPage({ negociacaoId, onBack }: Props) {
  const [cfg, setCfg] = useState<ConfigProposta>(configInicial);
  const [aba, setAba] = useState<'config' | 'conteudo' | 'preview'>('config');
  const [gerando, setGerando] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // ── helpers de estado ────────────────────────────────────────────────────
  const set = (partial: Partial<ConfigProposta>) =>
    setCfg(c => ({ ...c, ...partial }));

  const setSecao = (id: string, partial: Partial<SecaoProposta>) =>
    setCfg(c => ({
      ...c,
      secoes: c.secoes.map(s => (s.id === id ? { ...s, ...partial } : s)),
    }));

  const addSecao = () => set({ secoes: [...cfg.secoes, secaoVazia()] });

  const removeSecao = (id: string) =>
    set({ secoes: cfg.secoes.filter(s => s.id !== id) });

  const addItem = (secaoId: string) =>
    setSecao(secaoId, {
      itens: [
        ...(cfg.secoes.find(s => s.id === secaoId)?.itens || []),
        itemVazio(),
      ],
    });

  const setItem = (secaoId: string, itemId: string, partial: Partial<ItemProposta>) =>
    setSecao(secaoId, {
      itens: cfg.secoes
        .find(s => s.id === secaoId)!
        .itens.map(i => (i.id === itemId ? { ...i, ...partial } : i)),
    });

  const removeItem = (secaoId: string, itemId: string) =>
    setSecao(secaoId, {
      itens: cfg.secoes.find(s => s.id === secaoId)!.itens.filter(i => i.id !== itemId),
    });

  // ── upload de imagem ─────────────────────────────────────────────────────
  const handleImg = async (
    e: React.ChangeEvent<HTMLInputElement>,
    campo: keyof ConfigProposta
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await toBase64(file);
    set({ [campo]: b64 } as any);
  };

  const handleSlideExtra = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const b64s = await Promise.all(files.map(toBase64));
    set({ slidesExtras: [...cfg.slidesExtras, ...b64s] });
  };

  // ── totais ───────────────────────────────────────────────────────────────
  const totalSecao = (s: SecaoProposta) => ({
    produto: s.itens.reduce((acc, i) => acc + i.qtd * i.valorUnd, 0),
    servico: s.servicoValor,
    total: s.itens.reduce((acc, i) => acc + i.qtd * i.valorUnd, 0) + s.servicoValor,
  });

  const totalGeral = cfg.secoes.reduce(
    (acc, s) => {
      const t = totalSecao(s);
      return {
        produto: acc.produto + t.produto,
        servico: acc.servico + t.servico,
        total: acc.total + t.total,
      };
    },
    { produto: 0, servico: 0, total: 0 }
  );

  // ── geração do PDF ───────────────────────────────────────────────────────
  const gerarPDF = useCallback(async () => {
    if (!previewRef.current) return;
    setGerando(true);
    try {
      // Carrega html2pdf dinamicamente
      const html2pdf = (await import('html2pdf.js' as any)).default;
      const opt = {
        margin: 0,
        filename: `Proposta_${cfg.nomeCliente || 'cliente'}_${cfg.dataDoc.replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: cfg.orientacao === 'paisagem' ? 'landscape' : 'portrait',
        },
        pagebreak: { mode: ['avoid-all', 'css'], after: '.quebra-pagina' },
      };
      await html2pdf().set(opt).from(previewRef.current).save();
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar PDF. Verifique se html2pdf.js está instalado:\nnpm install html2pdf.js');
    }
    setGerando(false);
  }, [cfg]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-ast-bg text-foreground">
      {/* ── TOPO ── */}
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="text-ast-text3 hover:text-foreground text-sm flex items-center gap-1"
          >
            ← Voltar
          </button>
        )}
        <h1 className="text-xl font-bold">📄 Gerar Proposta</h1>
        {negociacaoId && (
          <span className="text-xs bg-ast-bg3 px-2 py-1 rounded text-ast-text3">
            Neg. #{negociacaoId}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setAba('preview')}
            className="px-4 py-2 bg-ast-bg3 text-foreground text-sm rounded hover:bg-ast-bg3/80"
          >
            👁 Preview
          </button>
          <button
            onClick={gerarPDF}
            disabled={gerando}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded font-bold hover:bg-primary/90 disabled:opacity-50"
          >
            {gerando ? '⏳ Gerando...' : '⬇ Baixar PDF'}
          </button>
        </div>
      </div>

      {/* ── ABAS ── */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(['config', 'conteudo', 'preview'] as const).map(a => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px transition-colors ${
              aba === a
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-ast-text3 hover:text-foreground'
            }`}
          >
            {a === 'config' ? '⚙ Configurações' : a === 'conteudo' ? '📋 Conteúdo' : '👁 Preview'}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ABA: CONFIGURAÇÕES
      ════════════════════════════════════════════════════════════════════ */}
      {aba === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">

          {/* Identidade visual */}
          <Card titulo="🎨 Identidade Visual">
            <Row label="Cor primária">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cfg.corPrimaria}
                  onChange={e => set({ corPrimaria: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="text-sm text-ast-text2">{cfg.corPrimaria}</span>
              </div>
            </Row>
            <Row label="Cor do texto capa">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cfg.corTexto}
                  onChange={e => set({ corTexto: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
            </Row>
            <Row label="Orientação">
              <select
                value={cfg.orientacao}
                onChange={e => set({ orientacao: e.target.value as any })}
                className={inputCls}
              >
                <option value="paisagem">Paisagem (16:9 — padrão)</option>
                <option value="retrato">Retrato (A4 vertical)</option>
              </select>
            </Row>
            <Row label="Logo da empresa">
              <UploadBtn
                label={cfg.logoUrl ? '✅ Logo carregado' : '📁 Escolher logo'}
                onChange={e => handleImg(e, 'logoUrl')}
                accept="image/*"
              />
              {cfg.logoUrl && (
                <img src={cfg.logoUrl} alt="logo" className="h-10 mt-2 object-contain" />
              )}
            </Row>
            <Row label="Imagem de fundo (capa)">
              <UploadBtn
                label={cfg.fundoCapaUrl ? '✅ Fundo carregado' : '📁 Escolher imagem'}
                onChange={e => handleImg(e, 'fundoCapaUrl')}
                accept="image/*"
              />
            </Row>
            <Row label="Slides extras (portfólio, clientes…)">
              <UploadBtn
                label="📁 Adicionar imagens"
                onChange={handleSlideExtra}
                accept="image/*"
                multiple
              />
              {cfg.slidesExtras.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {cfg.slidesExtras.map((s, i) => (
                    <div key={i} className="relative">
                      <img src={s} alt="" className="h-12 w-20 object-cover rounded" />
                      <button
                        onClick={() => set({ slidesExtras: cfg.slidesExtras.filter((_, j) => j !== i) })}
                        className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </Row>
          </Card>

          {/* Empresa emitente */}
          <Card titulo="🏢 Empresa Emitente">
            <Row label="Nome da empresa">
              <input className={inputCls} value={cfg.nomeEmpresa} onChange={e => set({ nomeEmpresa: e.target.value })} />
            </Row>
            <Row label="CNPJ">
              <input className={inputCls} value={cfg.cnpj} onChange={e => set({ cnpj: e.target.value })} />
            </Row>
            <Row label="Endereço">
              <input className={inputCls} value={cfg.endereco} onChange={e => set({ endereco: e.target.value })} />
            </Row>
            <Row label="Telefone">
              <input className={inputCls} value={cfg.telefone} onChange={e => set({ telefone: e.target.value })} />
            </Row>
            <Row label="E-mail">
              <input className={inputCls} value={cfg.email} onChange={e => set({ email: e.target.value })} />
            </Row>
          </Card>

          {/* Destinatário */}
          <Card titulo="👤 Destinatário">
            <Row label="Nome do cliente / empresa">
              <input className={inputCls} value={cfg.nomeCliente} onChange={e => set({ nomeCliente: e.target.value })} />
            </Row>
            <Row label="Nome do contato">
              <input className={inputCls} value={cfg.nomeContato} onChange={e => set({ nomeContato: e.target.value })} />
            </Row>
            <Row label="Data do documento">
              <input className={inputCls} value={cfg.dataDoc} onChange={e => set({ dataDoc: e.target.value })} />
            </Row>
          </Card>

          {/* Condições */}
          <Card titulo="💳 Condições & Observações">
            <Row label="Validade da proposta">
              <input className={inputCls} value={cfg.validadeProposta} onChange={e => set({ validadeProposta: e.target.value })} />
            </Row>
            <Row label="Condições de pagamento">
              <textarea
                className={inputCls + ' h-24 resize-none'}
                value={cfg.condicoesPagamento}
                onChange={e => set({ condicoesPagamento: e.target.value })}
              />
            </Row>
            <Row label="Observações gerais">
              <textarea
                className={inputCls + ' h-24 resize-none'}
                value={cfg.observacoes}
                onChange={e => set({ observacoes: e.target.value })}
              />
            </Row>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ABA: CONTEÚDO
      ════════════════════════════════════════════════════════════════════ */}
      {aba === 'conteudo' && (
        <div className="max-w-4xl space-y-6">

          {/* Apresentação */}
          <Card titulo="✉ Carta de Apresentação">
            <textarea
              className={inputCls + ' h-32 resize-none w-full'}
              placeholder="Texto de abertura da proposta…"
              value={cfg.apresentacao}
              onChange={e => set({ apresentacao: e.target.value })}
            />
          </Card>

          {/* Seções de itens */}
          {cfg.secoes.map((sec, si) => {
            const tot = totalSecao(sec);
            return (
              <div key={sec.id} className="bg-card border border-border rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ast-text3 font-bold uppercase tracking-widest">
                    Seção {si + 1}
                  </span>
                  <div className="flex-1">
                    <input
                      className={inputCls}
                      placeholder="Título da seção (ex: CINEMA, AUTOMAÇÃO…)"
                      value={sec.titulo}
                      onChange={e => setSecao(sec.id, { titulo: e.target.value })}
                    />
                  </div>
                  {cfg.secoes.length > 1 && (
                    <button
                      onClick={() => removeSecao(sec.id)}
                      className="text-red-400 hover:text-red-600 text-xs px-2 py-1 border border-red-400/30 rounded"
                    >
                      Remover seção
                    </button>
                  )}
                </div>

                <textarea
                  className={inputCls + ' h-20 resize-none w-full'}
                  placeholder="Descrição da seção (aparece abaixo do título no PDF)…"
                  value={sec.descricao}
                  onChange={e => setSecao(sec.id, { descricao: e.target.value })}
                />

                {/* Tabela de itens */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-ast-text3 text-xs uppercase tracking-wider">
                        <th className="text-left py-2 pr-3 w-1/2">Descrição do item</th>
                        <th className="text-center py-2 px-2 w-16">Qtd</th>
                        <th className="text-right py-2 px-2 w-32">Valor Unit.</th>
                        <th className="text-right py-2 px-2 w-32">Subtotal</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {sec.itens.map(item => (
                        <tr key={item.id} className="border-b border-border/40">
                          <td className="py-1.5 pr-3">
                            <input
                              className={inputCls + ' text-xs'}
                              placeholder="Amplificador JBL, Câmera…"
                              value={item.descricao}
                              onChange={e => setItem(sec.id, item.id, { descricao: e.target.value })}
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min={1}
                              className={inputCls + ' text-xs text-center'}
                              value={item.qtd}
                              onChange={e => setItem(sec.id, item.id, { qtd: Number(e.target.value) })}
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className={inputCls + ' text-xs text-right'}
                              value={item.valorUnd}
                              onChange={e => setItem(sec.id, item.id, { valorUnd: Number(e.target.value) })}
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right text-ast-text2 text-xs tabular-nums">
                            {fmt(item.qtd * item.valorUnd)}
                          </td>
                          <td className="py-1.5">
                            <button
                              onClick={() => removeItem(sec.id, item.id)}
                              className="text-ast-text3 hover:text-red-400 text-base w-6 h-6 flex items-center justify-center"
                            >×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    onClick={() => addItem(sec.id)}
                    className="text-xs text-primary border border-primary/40 rounded px-3 py-1.5 hover:bg-primary/10"
                  >
                    + Adicionar item
                  </button>
                  <div className="flex items-center gap-2 ml-auto">
                    <label className="text-xs text-ast-text3">Valor de serviço:</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className={inputCls + ' w-32 text-right text-xs'}
                      value={sec.servicoValor}
                      onChange={e => setSecao(sec.id, { servicoValor: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-6 text-sm pt-2 border-t border-border">
                  <span className="text-ast-text3">Produto: <strong className="text-foreground">{fmt(tot.produto)}</strong></span>
                  <span className="text-ast-text3">Serviço: <strong className="text-foreground">{fmt(tot.servico)}</strong></span>
                  <span className="text-ast-text3">Total seção: <strong style={{ color: cfg.corPrimaria }}>{fmt(tot.total)}</strong></span>
                </div>
              </div>
            );
          })}

          <button
            onClick={addSecao}
            className="w-full py-3 border-2 border-dashed border-border rounded-lg text-ast-text3 hover:border-primary hover:text-primary text-sm transition-colors"
          >
            + Adicionar nova seção
          </button>

          {/* Totais gerais */}
          <Card titulo="💰 Investimento Total">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-ast-bg3 rounded p-3">
                <div className="text-xs text-ast-text3 mb-1">Total Produto</div>
                <div className="font-bold text-lg">{fmt(totalGeral.produto)}</div>
              </div>
              <div className="bg-ast-bg3 rounded p-3">
                <div className="text-xs text-ast-text3 mb-1">Total Serviço</div>
                <div className="font-bold text-lg">{fmt(totalGeral.servico)}</div>
              </div>
              <div className="rounded p-3" style={{ background: cfg.corPrimaria + '22', border: `1px solid ${cfg.corPrimaria}` }}>
                <div className="text-xs text-ast-text3 mb-1">TOTAL GERAL</div>
                <div className="font-bold text-xl" style={{ color: cfg.corPrimaria }}>{fmt(totalGeral.total)}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ABA: PREVIEW / DOCUMENTO PDF
      ════════════════════════════════════════════════════════════════════ */}
      {aba === 'preview' && (
        <div className="space-y-4">
          <p className="text-xs text-ast-text3">
            ↓ Preview do documento que será exportado como PDF. Use o botão "Baixar PDF" no topo.
          </p>

          {/* Wrapper de escala para visualização no browser */}
          <div className="overflow-x-auto pb-8">
            <div
              style={{
                transformOrigin: 'top left',
                transform: 'scale(0.6)',
                width: cfg.orientacao === 'paisagem' ? '1587px' : '1122px',
                marginBottom: cfg.orientacao === 'paisagem' ? '-420px' : '-490px',
              }}
            >
              {/* ─── DOCUMENTO REAL (este div é exportado) ─── */}
              <div
                ref={previewRef}
                style={{
                  fontFamily: 'Arial, sans-serif',
                  width: cfg.orientacao === 'paisagem' ? '297mm' : '210mm',
                  background: '#fff',
                }}
              >
                {/* ══ SLIDE 1: CAPA ══ */}
                <PaginaPDF orientacao={cfg.orientacao}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: cfg.fundoCapaUrl
                        ? `url(${cfg.fundoCapaUrl}) center/cover no-repeat`
                        : '#1a1a1a',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* overlay escuro */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />

                    {/* conteúdo centralizado */}
                    <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px' }}>
                      {cfg.logoUrl && (
                        <img
                          src={cfg.logoUrl}
                          alt="logo"
                          style={{ maxHeight: '80px', maxWidth: '240px', objectFit: 'contain', marginBottom: '24px' }}
                        />
                      )}
                      <div
                        style={{
                          background: cfg.corPrimaria,
                          color: cfg.corTexto,
                          display: 'inline-block',
                          padding: '10px 32px',
                          fontSize: '14px',
                          fontWeight: 700,
                          letterSpacing: '3px',
                          textTransform: 'uppercase',
                          marginBottom: '20px',
                          borderRadius: '2px',
                        }}
                      >
                        PROPOSTA COMERCIAL
                      </div>
                      <div style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                        {cfg.nomeCliente || 'CLIENTE'}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                        {cfg.dataDoc}
                      </div>
                    </div>

                    {/* rodapé da capa */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: cfg.corPrimaria,
                      }}
                    />
                  </div>
                </PaginaPDF>

                {/* ══ SLIDE 2: CARTA DE APRESENTAÇÃO ══ */}
                <PaginaPDF orientacao={cfg.orientacao} className="quebra-pagina">
                  <SlideLayout corPrimaria={cfg.corPrimaria} logoUrl={cfg.logoUrl} nomeEmpresa={cfg.nomeEmpresa}>
                    <div style={{ padding: '48px 60px' }}>
                      <p style={{ color: cfg.corPrimaria, fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                        Prezado(a) <strong>{cfg.nomeContato || cfg.nomeCliente},</strong>
                      </p>
                      <p style={{ color: '#333', fontSize: '13px', lineHeight: 1.8, marginBottom: '32px', marginTop: '16px' }}>
                        {cfg.apresentacao}
                      </p>
                      <p style={{ color: '#555', fontSize: '12px' }}>Atenciosamente,</p>
                      <p style={{ color: cfg.corPrimaria, fontSize: '13px', fontWeight: 600 }}>{cfg.nomeEmpresa}</p>
                      <p style={{ color: '#777', fontSize: '11px', marginTop: '4px' }}>{cfg.telefone} · {cfg.email}</p>
                    </div>
                  </SlideLayout>
                </PaginaPDF>

                {/* ══ SLIDES DE SEÇÕES ══ */}
                {cfg.secoes.map(sec => {
                  const tot = totalSecao(sec);
                  return (
                    <PaginaPDF key={sec.id} orientacao={cfg.orientacao} className="quebra-pagina">
                      <SlideLayout corPrimaria={cfg.corPrimaria} logoUrl={cfg.logoUrl} nomeEmpresa={cfg.nomeEmpresa}>
                        <div style={{ padding: '32px 48px' }}>
                          {/* Título */}
                          <div style={{ marginBottom: '16px' }}>
                            <div
                              style={{
                                display: 'inline-block',
                                borderLeft: `4px solid ${cfg.corPrimaria}`,
                                paddingLeft: '12px',
                              }}
                            >
                              <div style={{ color: cfg.corPrimaria, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
                                — {sec.titulo || 'SEÇÃO'}
                              </div>
                            </div>
                            {sec.descricao && (
                              <p style={{ color: '#444', fontSize: '12px', lineHeight: 1.7, marginTop: '8px', maxWidth: '520px' }}>
                                {sec.descricao}
                              </p>
                            )}
                          </div>

                          {/* Tabela de itens */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '12px' }}>
                            <thead>
                              <tr style={{ background: '#222', color: '#fff' }}>
                                <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 600 }}>ITEM</th>
                                <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, width: '50px' }}>QTD</th>
                                <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, width: '110px' }}>R$ UND</th>
                                <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, width: '110px' }}>R$ SUBTOTAL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sec.itens.map((item, idx) => (
                                <tr
                                  key={item.id}
                                  style={{ background: idx % 2 === 0 ? '#f9f9f9' : '#fff' }}
                                >
                                  <td style={{ padding: '6px 12px', color: '#333' }}>{item.descricao}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#555' }}>{item.qtd}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#555' }}>
                                    {fmt(item.valorUnd)}
                                  </td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#333', fontWeight: 500 }}>
                                    {fmt(item.qtd * item.valorUnd)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: '#eee' }}>
                                <td colSpan={3} style={{ padding: '7px 12px', fontWeight: 700, fontSize: '12px' }}>
                                  TOTAL PRODUTO
                                </td>
                                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                                  {fmt(tot.produto)}
                                </td>
                              </tr>
                              {sec.servicoValor > 0 && (
                                <tr style={{ background: '#d6f0d6' }}>
                                  <td colSpan={3} style={{ padding: '7px 12px', fontWeight: 700, fontSize: '12px', color: '#2a6e2a' }}>
                                    SERVIÇO
                                  </td>
                                  <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, fontSize: '12px', color: '#2a6e2a' }}>
                                    {fmt(sec.servicoValor)}
                                  </td>
                                </tr>
                              )}
                            </tfoot>
                          </table>

                          {/* Condições mini */}
                          {cfg.condicoesPagamento && (
                            <p style={{ color: '#777', fontSize: '10px', lineHeight: 1.6, borderTop: '1px solid #eee', paddingTop: '8px' }}>
                              {cfg.condicoesPagamento}
                            </p>
                          )}
                        </div>
                      </SlideLayout>
                    </PaginaPDF>
                  );
                })}

                {/* ══ SLIDE INVESTIMENTO TOTAL ══ */}
                <PaginaPDF orientacao={cfg.orientacao} className="quebra-pagina">
                  <SlideLayout corPrimaria={cfg.corPrimaria} logoUrl={cfg.logoUrl} nomeEmpresa={cfg.nomeEmpresa}>
                    <div style={{ padding: '40px 60px' }}>
                      <h2 style={{ color: cfg.corPrimaria, fontSize: '20px', fontWeight: 800, marginBottom: '32px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        INVESTIMENTO
                      </h2>

                      {cfg.secoes.map(s => {
                        const t = totalSecao(s);
                        return (
                          <div key={s.id} style={{ marginBottom: '16px' }}>
                            <div style={{ color: cfg.corPrimaria, fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>
                              {s.titulo}
                            </div>
                            <div style={{ color: '#333', fontSize: '12px' }}>
                              PRODUTO: {fmt(t.produto)} &nbsp;&nbsp; SERVIÇO: {fmt(t.servico)}
                            </div>
                          </div>
                        );
                      })}

                      <div
                        style={{
                          marginTop: '24px',
                          padding: '16px 20px',
                          background: '#111',
                          borderRadius: '4px',
                          display: 'flex',
                          gap: '40px',
                        }}
                      >
                        <div>
                          <div style={{ color: '#aaa', fontSize: '10px', textTransform: 'uppercase' }}>Total Produto</div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{fmt(totalGeral.produto)}</div>
                        </div>
                        <div>
                          <div style={{ color: '#aaa', fontSize: '10px', textTransform: 'uppercase' }}>Total Serviço</div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{fmt(totalGeral.servico)}</div>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          <div style={{ color: '#aaa', fontSize: '10px', textTransform: 'uppercase' }}>Total Geral</div>
                          <div style={{ color: cfg.corPrimaria, fontWeight: 900, fontSize: '20px' }}>{fmt(totalGeral.total)}</div>
                        </div>
                      </div>

                      {cfg.observacoes && (
                        <p style={{ color: '#777', fontSize: '10px', marginTop: '20px', lineHeight: 1.6 }}>
                          {cfg.observacoes}
                        </p>
                      )}
                    </div>
                  </SlideLayout>
                </PaginaPDF>

                {/* ══ SLIDES EXTRAS (portfólio, clientes…) ══ */}
                {cfg.slidesExtras.map((src, i) => (
                  <PaginaPDF key={i} orientacao={cfg.orientacao} className="quebra-pagina">
                    <img
                      src={src}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </PaginaPDF>
                ))}

                {/* ══ SLIDE FINAL: CONTATO ══ */}
                <PaginaPDF orientacao={cfg.orientacao} className="quebra-pagina">
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: '#f2f2f2',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                    }}
                  >
                    {cfg.logoUrl && (
                      <img
                        src={cfg.logoUrl}
                        alt="logo"
                        style={{ maxHeight: '64px', objectFit: 'contain' }}
                      />
                    )}
                    <div style={{ color: '#111', fontWeight: 800, fontSize: '18px', letterSpacing: '3px' }}>
                      {cfg.nomeEmpresa}
                    </div>
                    <div style={{ color: '#777', fontSize: '12px', textAlign: 'center', lineHeight: 1.8 }}>
                      {cfg.cnpj}<br />
                      {cfg.endereco}<br />
                      {cfg.telefone} · {cfg.email}
                    </div>
                    <div style={{ marginTop: '12px', color: '#999', fontSize: '10px' }}>
                      Proposta válida por {cfg.validadeProposta} · {cfg.dataDoc}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: cfg.corPrimaria,
                      }}
                    />
                  </div>
                </PaginaPDF>
              </div>
              {/* ─── fim documento ─── */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SUBCOMPONENTES ───────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-ast-bg3 border border-border rounded px-3 py-1.5 text-foreground text-sm focus:outline-none focus:border-ast-border2';

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold mb-4 text-foreground">{titulo}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-ast-text3 mb-1">{label}</label>
      {children}
    </div>
  );
}

function UploadBtn({
  label,
  onChange,
  accept,
  multiple,
}: {
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  multiple?: boolean;
}) {
  return (
    <label className="inline-block cursor-pointer text-xs text-primary border border-primary/40 rounded px-3 py-1.5 hover:bg-primary/10">
      {label}
      <input type="file" accept={accept} multiple={multiple} onChange={onChange} className="hidden" />
    </label>
  );
}

/** Um "slide" com dimensões A4 paisagem ou retrato */
function PaginaPDF({
  children,
  orientacao,
  className = '',
}: {
  children: React.ReactNode;
  orientacao: 'paisagem' | 'retrato';
  className?: string;
}) {
  const w = orientacao === 'paisagem' ? '297mm' : '210mm';
  const h = orientacao === 'paisagem' ? '210mm' : '297mm';

  return (
    <div
      className={className}
      style={{
        width: w,
        height: h,
        overflow: 'hidden',
        position: 'relative',
        pageBreakAfter: 'always',
        background: '#fff',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}

/** Layout padrão com barra superior e rodapé */
function SlideLayout({
  children,
  corPrimaria,
  logoUrl,
  nomeEmpresa,
}: {
  children: React.ReactNode;
  corPrimaria: string;
  logoUrl: string;
  nomeEmpresa: string;
}) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* barra top */}
      <div style={{ height: '6px', background: corPrimaria, flexShrink: 0 }} />

      {/* conteúdo */}
      <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>

      {/* rodapé */}
      <div
        style={{
          height: '28px',
          background: '#111',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        {logoUrl && (
          <img src={logoUrl} alt="" style={{ height: '16px', objectFit: 'contain', opacity: 0.8 }} />
        )}
        <span style={{ color: '#aaa', fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {nomeEmpresa}
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ width: '20px', height: '2px', background: corPrimaria }} />
      </div>
    </div>
  );
}
