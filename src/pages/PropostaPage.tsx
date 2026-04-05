import React, { useState, useRef, useCallback } from 'react';
import { DB } from '@/lib/db';
import type { Produto, Servico } from '@/lib/types';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const toBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface ItemProposta {
  id: string;
  descricao: string;
  qtd: number;
  valorUnd: number;
  produtoId?: string;
  custoInstalacaoUnd?: number; // custo de instalação unitário do produto
}

interface SecaoProposta {
  id: string;
  titulo: string;
  descricao: string;
  itens: ItemProposta[];
  servicoValor: number;
  servicoEditado: boolean;
  descontoValor: number;
  descontoPct: number;
}

interface ConfigProposta {
  nomeCliente: string;
  nomeContato: string;
  dataDoc: string;
  logoUrl: string;
  fundoCapaUrl: string;
  corPrimaria: string;
  corTexto: string;
  orientacao: 'paisagem' | 'retrato';
  nomeEmpresa: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  apresentacao: string;
  secoes: SecaoProposta[];
  condicoesPagamento: string;
  validadeProposta: string;
  observacoes: string;
  slidesExtras: string[];
}

// ─── VALORES INICIAIS ─────────────────────────────────────────────────────────

const secaoVazia = (): SecaoProposta => ({
  id: uid(),
  titulo: '',
  descricao: '',
  itens: [],
  servicoValor: 0,
  servicoEditado: false,
  descontoValor: 0,
  descontoPct: 0,
});

const itemVazio = (): ItemProposta => ({
  id: uid(),
  descricao: '',
  qtd: 1,
  valorUnd: 0,
  custoInstalacaoUnd: 0,
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

// ─── ESTILOS ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-ast-bg3 border border-border rounded px-3 py-1.5 text-foreground text-sm focus:outline-none focus:border-ast-border2';

// ─── SUBCOMPONENTES UI ────────────────────────────────────────────────────────

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

function UploadBtn({ label, onChange, accept, multiple }: {
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

// ─── SUBCOMPONENTES PDF ───────────────────────────────────────────────────────

function PaginaPDF({ children, orientacao, className = '' }: {
  children: React.ReactNode;
  orientacao: 'paisagem' | 'retrato';
  className?: string;
}) {
  return (
    <div className={className} style={{
      width: orientacao === 'paisagem' ? '297mm' : '210mm',
      height: orientacao === 'paisagem' ? '210mm' : '297mm',
      overflow: 'hidden',
      position: 'relative',
      pageBreakAfter: 'always',
      background: '#fff',
      boxSizing: 'border-box',
    }}>
      {children}
    </div>
  );
}

function SlideLayout({ children, corPrimaria, logoUrl, nomeEmpresa }: {
  children: React.ReactNode;
  corPrimaria: string;
  logoUrl: string;
  nomeEmpresa: string;
}) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '6px', background: corPrimaria, flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
      <div style={{
        height: '28px', background: '#111', display: 'flex',
        alignItems: 'center', padding: '0 24px', flexShrink: 0, gap: '8px',
      }}>
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

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

interface Props {
  negociacaoId?: string;
  onBack?: () => void;
}

export default function PropostaPage({ negociacaoId, onBack }: Props) {
  const chaveDB = `proposta_${negociacaoId || 'avulsa'}`;

  const [cfg, setCfg] = useState<ConfigProposta>(() => {
    try {
      const salvo = DB.get<any>(chaveDB);
      if (salvo && salvo.length > 0) {
        const dados = salvo[0];
        // migrar dados antigos
        if (dados.secoes) {
          dados.secoes = dados.secoes.map((s: any) => ({
            servicoEditado: false,
            descontoValor: 0,
            descontoPct: 0,
            ...s,
            itens: (s.itens || []).map((i: any) => ({
              custoInstalacaoUnd: 0,
              produtoId: '',
              ...i,
            })),
          }));
        }
        return dados;
      }
    } catch {}
    return configInicial;
  });

  // ── ATENÇÃO: ordem das abas — começa em 'conteudo' ──
  const [aba, setAba] = useState<'conteudo' | 'preview' | 'config'>('conteudo');
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Catálogos
  const produtos = DB.get<Produto>('produtos').filter(p => p.ativo !== false);
  const servicos = DB.get<Servico>('servicos').filter(s => s.ativo !== false);

  // ── helpers de estado ─────────────────────────────────────────────────────

  const set = (partial: Partial<ConfigProposta>) =>
    setCfg(c => ({ ...c, ...partial }));

  const setSecao = (id: string, partial: Partial<SecaoProposta>) =>
    setCfg(c => ({
      ...c,
      secoes: c.secoes.map(s => (s.id === id ? { ...s, ...partial } : s)),
    }));

  const addSecao = () => set({ secoes: [...cfg.secoes, secaoVazia()] });
  const removeSecao = (id: string) => set({ secoes: cfg.secoes.filter(s => s.id !== id) });

  // ── Calcula serviço automático: soma custoInstalacao × qtd de todos os itens ──
  const calcServicoAuto = (itens: ItemProposta[]): number =>
    itens.reduce((acc, i) => acc + (i.custoInstalacaoUnd || 0) * i.qtd, 0);

  // ── Adicionar produto do catálogo ─────────────────────────────────────────
  const addProdutoCatalogo = (secaoId: string, produtoId: string) => {
    if (!produtoId) return;
    const prod = produtos.find(p => p.id === produtoId);
    if (!prod) return;
    const sec = cfg.secoes.find(s => s.id === secaoId)!;
    const novosItens = [...sec.itens, {
      id: uid(),
      descricao: prod.nome + (prod.marca ? ` — ${prod.marca}` : ''),
      qtd: 1,
      valorUnd: prod.preco,
      produtoId: prod.id,
      custoInstalacaoUnd: prod.custoInstalacao || 0,
    }];
    // Recalcula serviço automático se não foi editado manualmente
    const novoServico = sec.servicoEditado ? sec.servicoValor : calcServicoAuto(novosItens);
    setSecao(secaoId, { itens: novosItens, servicoValor: novoServico });
  };

  // ── Adicionar serviço do catálogo ─────────────────────────────────────────
  const addServicoCatalogo = (secaoId: string, servicoId: string) => {
    if (!servicoId) return;
    const serv = servicos.find(s => s.id === servicoId);
    if (!serv) return;
    const sec = cfg.secoes.find(s => s.id === secaoId)!;
    setSecao(secaoId, {
      servicoValor: sec.servicoValor + serv.valor,
      servicoEditado: true,
    });
  };

  // ── Adicionar item manual ─────────────────────────────────────────────────
  const addItemManual = (secaoId: string) => {
    const sec = cfg.secoes.find(s => s.id === secaoId)!;
    setSecao(secaoId, { itens: [...sec.itens, itemVazio()] });
  };

  // ── Atualizar item e recalcular serviço ───────────────────────────────────
  const setItem = (secaoId: string, itemId: string, partial: Partial<ItemProposta>) => {
    const sec = cfg.secoes.find(s => s.id === secaoId)!;
    const novosItens = sec.itens.map(i => (i.id === itemId ? { ...i, ...partial } : i));
    const novoServico = sec.servicoEditado ? sec.servicoValor : calcServicoAuto(novosItens);
    setSecao(secaoId, { itens: novosItens, servicoValor: novoServico });
  };

  const removeItem = (secaoId: string, itemId: string) => {
    const sec = cfg.secoes.find(s => s.id === secaoId)!;
    const novosItens = sec.itens.filter(i => i.id !== itemId);
    const novoServico = sec.servicoEditado ? sec.servicoValor : calcServicoAuto(novosItens);
    setSecao(secaoId, { itens: novosItens, servicoValor: novoServico });
  };

  // ── Desconto sincronizado ─────────────────────────────────────────────────
  const setDescontoPct = (secaoId: string, pct: number) => {
    const sec = cfg.secoes.find(s => s.id === secaoId)!;
    const base = sec.itens.reduce((a, i) => a + i.qtd * i.valorUnd, 0) + sec.servicoValor;
    setSecao(secaoId, { descontoPct: pct, descontoValor: pct > 0 ? (base * pct) / 100 : 0 });
  };

  const setDescontoValor = (secaoId: string, valor: number) => {
    const sec = cfg.secoes.find(s => s.id === secaoId)!;
    const base = sec.itens.reduce((a, i) => a + i.qtd * i.valorUnd, 0) + sec.servicoValor;
    setSecao(secaoId, {
      descontoValor: valor,
      descontoPct: base > 0 ? Math.round((valor / base) * 10000) / 100 : 0,
    });
  };

  // ── Totais ────────────────────────────────────────────────────────────────
  const totalSecao = (s: SecaoProposta) => {
    const produto  = s.itens.reduce((acc, i) => acc + i.qtd * i.valorUnd, 0);
    const servico  = s.servicoValor;
    const desconto = s.descontoValor || 0;
    return { produto, servico, desconto, total: produto + servico - desconto };
  };

  const totalGeral = cfg.secoes.reduce(
    (acc, s) => { const t = totalSecao(s); return { produto: acc.produto + t.produto, servico: acc.servico + t.servico, desconto: acc.desconto + t.desconto, total: acc.total + t.total }; },
    { produto: 0, servico: 0, desconto: 0, total: 0 }
  );

  // ── Upload imagens ────────────────────────────────────────────────────────
  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>, campo: keyof ConfigProposta) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set({ [campo]: await toBase64(file) } as any);
  };

  const handleSlideExtra = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const b64s = await Promise.all(files.map(toBase64));
    set({ slidesExtras: [...cfg.slidesExtras, ...b64s] });
  };

  // ── Salvar ────────────────────────────────────────────────────────────────
  const salvar = () => {
    setSalvando(true);
    try {
      DB.set(chaveDB, [cfg]);
      if (negociacaoId) {
        const negs = DB.get<any>('negociacoes');
        const idx = negs.findIndex((n: any) => n.id === negociacaoId);
        if (idx > -1) { negs[idx].valor = totalGeral.total; DB.set('negociacoes', negs); }
      }
      setTimeout(() => setSalvando(false), 1500);
    } catch { setSalvando(false); }
  };

  // ── Gerar PDF ─────────────────────────────────────────────────────────────
  const gerarPDF = useCallback(async () => {
    // Garante que o preview está visível antes de capturar
    setAba('preview');
    // Aguarda render completo
    await new Promise(r => setTimeout(r, 400));
    if (!previewRef.current) return;
    setGerando(true);
    try {
      const html2pdf = (await import('html2pdf.js' as any)).default;
      await html2pdf().set({
        margin: 0,
        filename: `Proposta_${cfg.nomeCliente || 'cliente'}_${cfg.dataDoc.replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: cfg.orientacao === 'paisagem' ? 'landscape' : 'portrait',
        },
        pagebreak: { mode: 'css', after: '.quebra-pagina' },
      }).from(previewRef.current).save();
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar PDF. Verifique se html2pdf.js está instalado:\nnpm install html2pdf.js');
    }
    setGerando(false);
  }, [cfg]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Ordem das abas: Conteúdo → Preview → Configurações
  const ABAS = [
    { key: 'conteudo' as const, label: '📋 Conteúdo' },
    { key: 'preview'  as const, label: '👁 Preview' },
    { key: 'config'   as const, label: '⚙ Configurações' },
  ];

  return (
    <div className="min-h-screen bg-ast-bg text-foreground">

      {/* TOPO */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {onBack && (
          <button onClick={onBack} className="text-ast-text3 hover:text-foreground text-sm flex items-center gap-1">
            ← Voltar
          </button>
        )}
        <h1 className="text-xl font-bold">📄 Gerar Proposta</h1>
        {negociacaoId && (
          <span className="text-xs bg-ast-bg3 px-2 py-1 rounded text-ast-text3">Neg. #{negociacaoId}</span>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={salvar} className="px-4 py-2 bg-ast-bg3 text-foreground text-sm rounded hover:bg-ast-bg3/80">
            {salvando ? '✅ Salvo!' : '💾 Salvar'}
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

      {/* ABAS — ordem: Conteúdo | Preview | Configurações */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {ABAS.map(a => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              aba === a.key
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-ast-text3 hover:text-foreground'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ABA: CONTEÚDO  (padrão ao abrir)
      ══════════════════════════════════════════════════════════════════ */}
      {aba === 'conteudo' && (
        <div className="max-w-5xl space-y-6">

          <Card titulo="✉ Carta de Apresentação">
            <textarea
              className={inputCls + ' h-28 resize-none w-full'}
              placeholder="Texto de abertura da proposta…"
              value={cfg.apresentacao}
              onChange={e => set({ apresentacao: e.target.value })}
            />
          </Card>

          {cfg.secoes.map((sec, si) => {
            const tot = totalSecao(sec);
            return (
              <div key={sec.id} className="bg-card border border-border rounded-lg p-5 space-y-4">

                {/* Cabeçalho seção */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ast-text3 font-bold uppercase tracking-widest shrink-0">
                    Seção {si + 1}
                  </span>
                  <input
                    className={inputCls}
                    placeholder="Título (ex: CINEMA, AUTOMAÇÃO…)"
                    value={sec.titulo}
                    onChange={e => setSecao(sec.id, { titulo: e.target.value })}
                  />
                  {cfg.secoes.length > 1 && (
                    <button
                      onClick={() => removeSecao(sec.id)}
                      className="text-red-400 hover:text-red-600 text-xs px-2 py-1 border border-red-400/30 rounded shrink-0"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <textarea
                  className={inputCls + ' h-14 resize-none w-full'}
                  placeholder="Descrição da seção (opcional)…"
                  value={sec.descricao}
                  onChange={e => setSecao(sec.id, { descricao: e.target.value })}
                />

                {/* Seletor rápido do catálogo */}
                <div className="flex gap-3 flex-wrap items-end p-3 bg-ast-bg3 rounded-lg border border-border">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] text-ast-text3 mb-1 uppercase tracking-wider">
                      ➕ Adicionar produto do catálogo
                    </label>
                    <select
                      className={inputCls + ' text-xs'}
                      value=""
                      onChange={e => { addProdutoCatalogo(sec.id, e.target.value); (e.target as HTMLSelectElement).value = ''; }}
                    >
                      <option value="">Selecionar produto…</option>
                      {produtos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome}{p.marca ? ` — ${p.marca}` : ''}
                          {' · '}R$ {p.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          {(p.custoInstalacao || 0) > 0
                            ? ` · Instal. R$ ${p.custoInstalacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/un`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] text-ast-text3 mb-1 uppercase tracking-wider">
                      ➕ Adicionar serviço do catálogo
                    </label>
                    <select
                      className={inputCls + ' text-xs'}
                      value=""
                      onChange={e => { addServicoCatalogo(sec.id, e.target.value); (e.target as HTMLSelectElement).value = ''; }}
                    >
                      <option value="">Selecionar serviço…</option>
                      {servicos.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nome} · R$ {s.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── TABELA DE ITENS com coluna de instalação ── */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-ast-text3 text-[10px] uppercase tracking-wider">
                        <th className="text-left py-2 pr-2">Descrição do item</th>
                        <th className="text-center py-2 px-2 w-14">Qtd</th>
                        <th className="text-right py-2 px-2 w-28">Valor Unit.</th>
                        {/* Coluna instalação — visível apenas na montagem, não vai para o PDF */}
                        <th className="text-right py-2 px-2 w-28 text-green-500/70">Instalação/un</th>
                        <th className="text-right py-2 px-2 w-28 text-green-500/70">Instal. total</th>
                        <th className="text-right py-2 px-2 w-28">Subtotal prod.</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {sec.itens.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-5 text-center text-xs text-ast-text3">
                            Use os seletores acima para adicionar produtos, ou clique em "+ Item manual"
                          </td>
                        </tr>
                      )}
                      {sec.itens.map(item => (
                        <tr key={item.id} className="border-b border-border/40">
                          <td className="py-1.5 pr-2">
                            <input
                              className={inputCls + ' text-xs'}
                              placeholder="Nome do item…"
                              value={item.descricao}
                              onChange={e => setItem(sec.id, item.id, { descricao: e.target.value })}
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number" min={1}
                              className={inputCls + ' text-xs text-center'}
                              value={item.qtd}
                              onChange={e => setItem(sec.id, item.id, { qtd: Math.max(1, Number(e.target.value)) })}
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number" min={0} step={0.01}
                              className={inputCls + ' text-xs text-right'}
                              value={item.valorUnd}
                              onChange={e => setItem(sec.id, item.id, { valorUnd: Number(e.target.value) })}
                            />
                          </td>
                          {/* Custo instalação editável por item */}
                          <td className="py-1.5 px-2">
                            <input
                              type="number" min={0} step={0.01}
                              className={inputCls + ' text-xs text-right border-green-500/30 focus:border-green-500/60'}
                              value={item.custoInstalacaoUnd || ''}
                              placeholder="0,00"
                              onChange={e => setItem(sec.id, item.id, { custoInstalacaoUnd: Number(e.target.value) })}
                              title="Custo de instalação por unidade"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right text-green-500/80 text-xs tabular-nums">
                            {(item.custoInstalacaoUnd || 0) > 0
                              ? fmt((item.custoInstalacaoUnd || 0) * item.qtd)
                              : <span className="text-ast-text3">—</span>}
                          </td>
                          <td className="py-1.5 px-2 text-right text-ast-text2 text-xs tabular-nums font-medium">
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
                    {sec.itens.length > 0 && (
                      <tfoot>
                        <tr className="text-xs text-ast-text3 border-t border-border">
                          <td colSpan={3} className="py-1.5 pr-2 text-right">Totais:</td>
                          <td colSpan={2} className="py-1.5 px-2 text-right text-green-400 font-semibold">
                            {fmt(calcServicoAuto(sec.itens))} instalação
                          </td>
                          <td className="py-1.5 px-2 text-right text-foreground font-semibold">
                            {fmt(sec.itens.reduce((a, i) => a + i.qtd * i.valorUnd, 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Rodapé: serviço + desconto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">

                  {/* Serviço */}
                  <div>
                    <label className="block text-[10px] text-ast-text3 mb-1 uppercase tracking-wider">
                      🔧 Valor de serviço / instalação
                      {!sec.servicoEditado && (
                        <span className="ml-2 text-green-400 normal-case font-normal">✓ automático</span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={0} step={0.01}
                        className={inputCls + ' text-xs text-right'}
                        value={sec.servicoValor}
                        onChange={e => setSecao(sec.id, { servicoValor: Number(e.target.value), servicoEditado: true })}
                      />
                      {sec.servicoEditado && (
                        <button
                          title="Restaurar cálculo automático"
                          onClick={() => setSecao(sec.id, { servicoValor: calcServicoAuto(sec.itens), servicoEditado: false })}
                          className="text-[10px] text-primary border border-primary/30 rounded px-2 py-1 hover:bg-primary/10 shrink-0"
                        >
                          ↺ Auto
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Desconto */}
                  <div>
                    <label className="block text-[10px] text-ast-text3 mb-1 uppercase tracking-wider">
                      🏷️ Desconto (aparecerá na proposta)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="number" min={0} max={100} step={0.5}
                          className={inputCls + ' text-xs text-right w-20'}
                          value={sec.descontoPct || ''}
                          placeholder="0"
                          onChange={e => setDescontoPct(sec.id, Number(e.target.value))}
                        />
                        <span className="text-xs text-ast-text3 shrink-0">%</span>
                      </div>
                      <span className="text-xs text-ast-text3">ou</span>
                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-xs text-ast-text3 shrink-0">R$</span>
                        <input
                          type="number" min={0} step={0.01}
                          className={inputCls + ' text-xs text-right'}
                          value={sec.descontoValor || ''}
                          placeholder="0,00"
                          onChange={e => setDescontoValor(sec.id, Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botão + totais */}
                <div className="flex items-center gap-3 flex-wrap pt-1">
                  <button
                    onClick={() => addItemManual(sec.id)}
                    className="text-xs text-primary border border-primary/40 rounded px-3 py-1.5 hover:bg-primary/10"
                  >
                    + Item manual
                  </button>
                  <div className="ml-auto flex gap-4 text-sm flex-wrap justify-end">
                    <span className="text-ast-text3">Produto: <strong className="text-foreground">{fmt(tot.produto)}</strong></span>
                    <span className="text-ast-text3">Serviço: <strong className="text-foreground">{fmt(tot.servico)}</strong></span>
                    {tot.desconto > 0 && (
                      <span className="text-green-400 font-semibold">Desconto: -{fmt(tot.desconto)}</span>
                    )}
                    <span className="font-bold" style={{ color: cfg.corPrimaria }}>
                      Total: {fmt(tot.total)}
                    </span>
                  </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-ast-bg3 rounded p-3">
                <div className="text-xs text-ast-text3 mb-1">Total Produto</div>
                <div className="font-bold text-lg">{fmt(totalGeral.produto)}</div>
              </div>
              <div className="bg-ast-bg3 rounded p-3">
                <div className="text-xs text-ast-text3 mb-1">Total Serviço</div>
                <div className="font-bold text-lg">{fmt(totalGeral.servico)}</div>
              </div>
              {totalGeral.desconto > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                  <div className="text-xs text-ast-text3 mb-1">Desconto Total</div>
                  <div className="font-bold text-lg text-green-400">-{fmt(totalGeral.desconto)}</div>
                </div>
              )}
              <div className="rounded p-3 col-span-1" style={{ background: cfg.corPrimaria + '22', border: `1px solid ${cfg.corPrimaria}` }}>
                <div className="text-xs text-ast-text3 mb-1">TOTAL GERAL</div>
                <div className="font-bold text-xl" style={{ color: cfg.corPrimaria }}>{fmt(totalGeral.total)}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ABA: PREVIEW
      ══════════════════════════════════════════════════════════════════ */}
      {aba === 'preview' && (
        <div className="space-y-4">
          <p className="text-xs text-ast-text3">
            Preview do documento que será enviado ao cliente. As colunas de instalação <strong>não aparecem</strong> no PDF — apenas o resumo de serviço.
          </p>
          <div className="overflow-x-auto pb-8">
            <div style={{
              transformOrigin: 'top left',
              transform: 'scale(0.6)',
              width: cfg.orientacao === 'paisagem' ? '1587px' : '1122px',
              marginBottom: cfg.orientacao === 'paisagem' ? '-420px' : '-490px',
            }}>
              {/* ── DOCUMENTO EXPORTADO ── */}
              <div
                ref={previewRef}
                style={{
                  fontFamily: 'Arial, sans-serif',
                  width: cfg.orientacao === 'paisagem' ? '297mm' : '210mm',
                  background: '#fff',
                }}
              >

                {/* CAPA */}
                <PaginaPDF orientacao={cfg.orientacao}>
                  <div style={{
                    width: '100%', height: '100%',
                    background: cfg.fundoCapaUrl
                      ? `url(${cfg.fundoCapaUrl}) center/cover no-repeat`
                      : '#1a1a1a',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
                    <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px' }}>
                      {cfg.logoUrl && (
                        <img src={cfg.logoUrl} alt="logo" style={{ maxHeight: '80px', maxWidth: '240px', objectFit: 'contain', marginBottom: '24px' }} />
                      )}
                      <div style={{
                        background: cfg.corPrimaria, color: cfg.corTexto,
                        display: 'inline-block', padding: '10px 32px',
                        fontSize: '14px', fontWeight: 700, letterSpacing: '3px',
                        textTransform: 'uppercase', marginBottom: '20px', borderRadius: '2px',
                      }}>
                        PROPOSTA COMERCIAL
                      </div>
                      <div style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                        {cfg.nomeCliente || 'CLIENTE'}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{cfg.dataDoc}</div>
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: cfg.corPrimaria }} />
                  </div>
                </PaginaPDF>

                {/* APRESENTAÇÃO */}
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

                {/* SEÇÕES — apenas produto + serviço + desconto (sem coluna instalação) */}
                {cfg.secoes.map(sec => {
                  const tot = totalSecao(sec);
                  return (
                    <PaginaPDF key={sec.id} orientacao={cfg.orientacao} className="quebra-pagina">
                      <SlideLayout corPrimaria={cfg.corPrimaria} logoUrl={cfg.logoUrl} nomeEmpresa={cfg.nomeEmpresa}>
                        <div style={{ padding: '28px 44px' }}>
                          <div style={{ marginBottom: '14px', display: 'inline-block', borderLeft: `4px solid ${cfg.corPrimaria}`, paddingLeft: '12px' }}>
                            <div style={{ color: cfg.corPrimaria, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
                              — {sec.titulo || 'SEÇÃO'}
                            </div>
                            {sec.descricao && (
                              <p style={{ color: '#444', fontSize: '11px', lineHeight: 1.6, marginTop: '4px', maxWidth: '500px' }}>
                                {sec.descricao}
                              </p>
                            )}
                          </div>

                          {/* Tabela do cliente: apenas item, qtd, valor unit, subtotal */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginBottom: '10px' }}>
                            <thead>
                              <tr style={{ background: '#222', color: '#fff' }}>
                                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>ITEM</th>
                                <th style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 600, width: '40px' }}>QTD</th>
                                <th style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 600, width: '100px' }}>R$ UND</th>
                                <th style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 600, width: '100px' }}>R$ SUBTOTAL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sec.itens.map((item, idx) => (
                                <tr key={item.id} style={{ background: idx % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                                  <td style={{ padding: '5px 10px', color: '#333' }}>{item.descricao}</td>
                                  <td style={{ padding: '5px 6px', textAlign: 'center', color: '#555' }}>{item.qtd}</td>
                                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#555' }}>{fmt(item.valorUnd)}</td>
                                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#333', fontWeight: 500 }}>{fmt(item.qtd * item.valorUnd)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: '#eee' }}>
                                <td colSpan={3} style={{ padding: '6px 10px', fontWeight: 700, fontSize: '11px' }}>TOTAL PRODUTO</td>
                                <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, fontSize: '11px' }}>{fmt(tot.produto)}</td>
                              </tr>
                              {sec.servicoValor > 0 && (
                                <tr style={{ background: '#d6f0d6' }}>
                                  <td colSpan={3} style={{ padding: '6px 10px', fontWeight: 700, fontSize: '11px', color: '#2a6e2a' }}>
                                    SERVIÇO / INSTALAÇÃO
                                  </td>
                                  <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, fontSize: '11px', color: '#2a6e2a' }}>
                                    {fmt(sec.servicoValor)}
                                  </td>
                                </tr>
                              )}
                              {/* DESCONTO — aparece no PDF do cliente */}
                              {(sec.descontoValor || 0) > 0 && (
                                <tr style={{ background: '#fff8e1' }}>
                                  <td colSpan={3} style={{ padding: '6px 10px', fontWeight: 700, fontSize: '11px', color: '#856600' }}>
                                    🏷️ DESCONTO{sec.descontoPct > 0 ? ` (${sec.descontoPct.toFixed(1)}%)` : ''}
                                  </td>
                                  <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, fontSize: '11px', color: '#856600' }}>
                                    -{fmt(sec.descontoValor)}
                                  </td>
                                </tr>
                              )}
                              <tr style={{ background: cfg.corPrimaria, color: '#fff' }}>
                                <td colSpan={3} style={{ padding: '7px 10px', fontWeight: 800, fontSize: '12px' }}>TOTAL DA SEÇÃO</td>
                                <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 800, fontSize: '12px' }}>{fmt(tot.total)}</td>
                              </tr>
                            </tfoot>
                          </table>

                          {cfg.condicoesPagamento && (
                            <p style={{ color: '#777', fontSize: '9.5px', lineHeight: 1.5, borderTop: '1px solid #eee', paddingTop: '7px' }}>
                              {cfg.condicoesPagamento}
                            </p>
                          )}
                        </div>
                      </SlideLayout>
                    </PaginaPDF>
                  );
                })}

                {/* INVESTIMENTO TOTAL */}
                <PaginaPDF orientacao={cfg.orientacao} className="quebra-pagina">
                  <SlideLayout corPrimaria={cfg.corPrimaria} logoUrl={cfg.logoUrl} nomeEmpresa={cfg.nomeEmpresa}>
                    <div style={{ padding: '36px 56px' }}>
                      <h2 style={{ color: cfg.corPrimaria, fontSize: '20px', fontWeight: 800, marginBottom: '28px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        INVESTIMENTO
                      </h2>

                      {cfg.secoes.map(s => {
                        const t = totalSecao(s);
                        if (!s.titulo && t.total === 0) return null;
                        return (
                          <div key={s.id} style={{ marginBottom: '14px' }}>
                            <div style={{ color: cfg.corPrimaria, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>{s.titulo}</div>
                            <div style={{ color: '#333', fontSize: '11px' }}>
                              Produto: {fmt(t.produto)}&nbsp;&nbsp;
                              Serviço: {fmt(t.servico)}
                              {t.desconto > 0 && (
                                <span style={{ color: '#856600' }}>&nbsp;&nbsp;Desconto: -{fmt(t.desconto)}</span>
                              )}
                              &nbsp;&nbsp;<strong>Total: {fmt(t.total)}</strong>
                            </div>
                          </div>
                        );
                      })}

                      <div style={{ marginTop: '24px', padding: '16px 20px', background: '#111', borderRadius: '4px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ color: '#aaa', fontSize: '9px', textTransform: 'uppercase' }}>Total Produto</div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{fmt(totalGeral.produto)}</div>
                        </div>
                        <div>
                          <div style={{ color: '#aaa', fontSize: '9px', textTransform: 'uppercase' }}>Total Serviço</div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{fmt(totalGeral.servico)}</div>
                        </div>
                        {totalGeral.desconto > 0 && (
                          <div>
                            <div style={{ color: '#aaa', fontSize: '9px', textTransform: 'uppercase' }}>Desconto</div>
                            <div style={{ color: '#f5c842', fontWeight: 700, fontSize: '13px' }}>-{fmt(totalGeral.desconto)}</div>
                          </div>
                        )}
                        <div style={{ marginLeft: 'auto' }}>
                          <div style={{ color: '#aaa', fontSize: '9px', textTransform: 'uppercase' }}>Total Geral</div>
                          <div style={{ color: cfg.corPrimaria, fontWeight: 900, fontSize: '20px' }}>{fmt(totalGeral.total)}</div>
                        </div>
                      </div>

                      {cfg.observacoes && (
                        <p style={{ color: '#777', fontSize: '9.5px', marginTop: '18px', lineHeight: 1.5 }}>
                          {cfg.observacoes}
                        </p>
                      )}
                    </div>
                  </SlideLayout>
                </PaginaPDF>

                {/* SLIDES EXTRAS */}
                {cfg.slidesExtras.map((src, i) => (
                  <PaginaPDF key={i} orientacao={cfg.orientacao} className="quebra-pagina">
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </PaginaPDF>
                ))}

                {/* ENCERRAMENTO */}
                <PaginaPDF orientacao={cfg.orientacao} className="quebra-pagina">
                  <div style={{
                    width: '100%', height: '100%', background: '#f2f2f2',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: '12px', position: 'relative',
                  }}>
                    {cfg.logoUrl && (
                      <img src={cfg.logoUrl} alt="logo" style={{ maxHeight: '64px', objectFit: 'contain' }} />
                    )}
                    <div style={{ color: '#111', fontWeight: 800, fontSize: '18px', letterSpacing: '3px' }}>{cfg.nomeEmpresa}</div>
                    <div style={{ color: '#777', fontSize: '12px', textAlign: 'center', lineHeight: 1.8 }}>
                      {cfg.cnpj}<br />{cfg.endereco}<br />{cfg.telefone} · {cfg.email}
                    </div>
                    <div style={{ color: '#999', fontSize: '10px' }}>
                      Proposta válida por {cfg.validadeProposta} · {cfg.dataDoc}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: cfg.corPrimaria }} />
                  </div>
                </PaginaPDF>

              </div>
              {/* fim documento */}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ABA: CONFIGURAÇÕES  (última)
      ══════════════════════════════════════════════════════════════════ */}
      {aba === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">

          <Card titulo="🎨 Identidade Visual">
            <Row label="Cor primária">
              <div className="flex items-center gap-2">
                <input type="color" value={cfg.corPrimaria} onChange={e => set({ corPrimaria: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
                <span className="text-sm text-ast-text2">{cfg.corPrimaria}</span>
              </div>
            </Row>
            <Row label="Cor do texto da capa">
              <input type="color" value={cfg.corTexto} onChange={e => set({ corTexto: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
            </Row>
            <Row label="Orientação">
              <select value={cfg.orientacao} onChange={e => set({ orientacao: e.target.value as any })} className={inputCls}>
                <option value="paisagem">Paisagem (16:9 — padrão)</option>
                <option value="retrato">Retrato (A4 vertical)</option>
              </select>
            </Row>
            <Row label="Logo da empresa">
              <UploadBtn label={cfg.logoUrl ? '✅ Logo carregado' : '📁 Escolher logo'} onChange={e => handleImg(e, 'logoUrl')} accept="image/*" />
              {cfg.logoUrl && <img src={cfg.logoUrl} alt="logo" className="h-10 mt-2 object-contain" />}
            </Row>
            <Row label="Imagem de fundo (capa)">
              <UploadBtn label={cfg.fundoCapaUrl ? '✅ Fundo carregado' : '📁 Escolher imagem'} onChange={e => handleImg(e, 'fundoCapaUrl')} accept="image/*" />
            </Row>
            <Row label="Slides extras (portfólio, clientes…)">
              <UploadBtn label="📁 Adicionar imagens" onChange={handleSlideExtra} accept="image/*" multiple />
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

          <Card titulo="🏢 Empresa Emitente">
            <Row label="Nome da empresa"><input className={inputCls} value={cfg.nomeEmpresa} onChange={e => set({ nomeEmpresa: e.target.value })} /></Row>
            <Row label="CNPJ"><input className={inputCls} value={cfg.cnpj} onChange={e => set({ cnpj: e.target.value })} /></Row>
            <Row label="Endereço"><input className={inputCls} value={cfg.endereco} onChange={e => set({ endereco: e.target.value })} /></Row>
            <Row label="Telefone"><input className={inputCls} value={cfg.telefone} onChange={e => set({ telefone: e.target.value })} /></Row>
            <Row label="E-mail"><input className={inputCls} value={cfg.email} onChange={e => set({ email: e.target.value })} /></Row>
          </Card>

          <Card titulo="👤 Destinatário">
            <Row label="Nome do cliente / empresa"><input className={inputCls} value={cfg.nomeCliente} onChange={e => set({ nomeCliente: e.target.value })} /></Row>
            <Row label="Nome do contato"><input className={inputCls} value={cfg.nomeContato} onChange={e => set({ nomeContato: e.target.value })} /></Row>
            <Row label="Data do documento"><input className={inputCls} value={cfg.dataDoc} onChange={e => set({ dataDoc: e.target.value })} /></Row>
          </Card>

          <Card titulo="💳 Condições & Observações">
            <Row label="Validade da proposta"><input className={inputCls} value={cfg.validadeProposta} onChange={e => set({ validadeProposta: e.target.value })} /></Row>
            <Row label="Condições de pagamento">
              <textarea className={inputCls + ' h-24 resize-none'} value={cfg.condicoesPagamento} onChange={e => set({ condicoesPagamento: e.target.value })} />
            </Row>
            <Row label="Observações gerais">
              <textarea className={inputCls + ' h-24 resize-none'} value={cfg.observacoes} onChange={e => set({ observacoes: e.target.value })} />
            </Row>
          </Card>

        </div>
      )}

    </div>
  );
}
