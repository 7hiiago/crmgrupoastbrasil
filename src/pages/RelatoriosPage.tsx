import React, { useState, useMemo } from 'react';
import { DB, fmt, fmtDate } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { Negociacao, User, Cliente, Parceiro } from '@/lib/types';
import { PageHeader, Tabs, Btn } from '@/components/UIComponents';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function parseDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(';')),
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Valor real da proposta salva
function getValorProposta(n: Negociacao): number {
  try {
    const salvo = DB.get<any>(`proposta_${n.id}`);
    if (salvo && salvo.length > 0) {
      const secoes = salvo[0].secoes || [];
      const total = secoes.reduce((acc: number, s: any) => {
        const prod = s.itens?.reduce((a: number, i: any) => a + (i.qtd * i.valorUnd), 0) || 0;
        return acc + prod + (s.servicoValor || 0);
      }, 0);
      if (total > 0) return total;
    }
  } catch {}
  return n.valor || 0;
}

// ─── Componentes visuais ──────────────────────────────────────────────────────
function KPI({ label, value, sub, accent = '#378ADD' }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3.5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[3px] h-full rounded-l-xl" style={{ background: accent }} />
      <div className="text-[10px] text-ast-text3 tracking-[0.8px] uppercase mb-2">{label}</div>
      <div className="font-condensed text-[22px] font-black leading-none" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-[10px] text-ast-text2 mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <span className="text-[10px] text-ast-text3 tracking-[0.8px] uppercase font-medium">{title}</span>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="bg-ast-bg3 text-ast-text3 text-[9px] tracking-[0.6px] px-4 py-2.5 text-left font-medium uppercase border-b border-border whitespace-nowrap">
    {children}
  </th>
);
const TD = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-2.5 border-b border-border text-ast-text2 ${className}`}>{children}</td>
);

const CHART_COLORS = ['#378ADD','#639922','#EF9F27','#E24B4A','#7F77DD','#1D9E75','#F06292','#4DB6AC'];
const STATUS_COLORS: Record<string, string> = {
  contato: '#378ADD', levantamento: '#1D9E75', proposta: '#EF9F27',
  negociacao: '#7F77DD', fechada: '#639922', perdida: '#E24B4A',
};
const STATUS_LABELS: Record<string, string> = {
  contato: 'Contato', levantamento: 'Levantamento', proposta: 'Proposta',
  negociacao: 'Em negociação', fechada: 'Fechada', perdida: 'Perdida',
};

// ─── Tipos de período ─────────────────────────────────────────────────────────
type Periodo = 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual';

const PERIODO_LABELS: Record<Periodo, string> = {
  semanal: 'Semanal', mensal: 'Mensal', trimestral: 'Trimestral',
  semestral: 'Semestral', anual: 'Anual',
};

function filtroPorPeriodo(negs: Negociacao[], periodo: Periodo, ano: number, mes: number): Negociacao[] {
  return negs.filter(n => {
    const d = parseDate(n.data);
    if (!d) return false;
    const ny = d.getFullYear(), nm = d.getMonth(), nw = getWeekOfYear(d);
    switch (periodo) {
      case 'anual':      return ny === ano;
      case 'semestral':  return ny === ano && (mes < 6 ? nm < 6 : nm >= 6);
      case 'trimestral': {
        const q = Math.floor(mes / 3);
        return ny === ano && Math.floor(nm / 3) === q;
      }
      case 'mensal':     return ny === ano && nm === mes;
      case 'semanal':    return ny === ano && nm === mes && nw === getWeekOfYear(new Date());
      default:           return ny === ano;
    }
  });
}

function getWeekOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

// ─── Abas ─────────────────────────────────────────────────────────────────────
const TABS_BASE = [
  { key: 'visao',      label: 'Visão Geral' },
  { key: 'mensal',     label: 'Evolução' },
  { key: 'produtos',   label: 'Projetos' },
  { key: 'indicacoes', label: 'Indicações' },
];
const TAB_VENDEDOR = { key: 'vendedor', label: 'Por Vendedor' };

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab]         = useState('visao');
  const [ano, setAno]         = useState(new Date().getFullYear());
  const [mes, setMes]         = useState(new Date().getMonth());
  const [periodo, setPeriodo] = useState<Periodo>('anual');
  const [filterUid, setFilterUid] = useState('all');
  // Ordenação do relatório de indicações
  const [indSort, setIndSort] = useState<'indicacoes' | 'valor'>('valor');

  const allNegs   = DB.get<Negociacao>('negociacoes');
  const users     = DB.get<User>('users').filter(u => u.ativo !== false);
  const parceiros = DB.get<Parceiro>('parceiros');

  // ── Filtro base por usuário ──────────────────────────────────────────
  // Não-admin vê apenas suas negociações; admin pode filtrar por vendedor
  const negsBase = useMemo(() => {
    if (!isAdmin) return allNegs.filter(n => n.responsavelId === user?.id);
    if (filterUid !== 'all') return allNegs.filter(n => n.responsavelId === filterUid);
    return allNegs;
  }, [allNegs, isAdmin, user, filterUid]);

  // ── Filtro por período ───────────────────────────────────────────────
  const negsPeriodo = useMemo(
    () => filtroPorPeriodo(negsBase, periodo, ano, mes),
    [negsBase, periodo, ano, mes]
  );

  // Também filtra por ano para gráficos mensais
  const negsAno = useMemo(
    () => negsBase.filter(n => parseDate(n.data)?.getFullYear() === ano),
    [negsBase, ano]
  );

  // ── KPIs do período ──────────────────────────────────────────────────
  const fechadasP  = negsPeriodo.filter(n => n.status === 'fechada');
  const perdidasP  = negsPeriodo.filter(n => n.status === 'perdida');
  const totalFat   = fechadasP.reduce((s, n) => s + getValorProposta(n), 0);
  const ticketMed  = fechadasP.length ? Math.round(totalFat / fechadasP.length) : 0;
  const taxaConv   = negsPeriodo.length ? Math.round((fechadasP.length / negsPeriodo.length) * 100) : 0;
  const pipeline   = negsPeriodo
    .filter(n => !['fechada','perdida'].includes(n.status))
    .reduce((s, n) => s + getValorProposta(n), 0);

  // ── Status distribution ───────────────────────────────────────────────
  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    negsPeriodo.forEach(n => { map[n.status] = (map[n.status] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({
      status, count, label: STATUS_LABELS[status] || status,
    }));
  }, [negsPeriodo]);

  // ── Evolução mensal (sempre por ano) ──────────────────────────────────
  const mensalData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      mes: MONTHS_PT[i], iniciadas: 0, fechadas: 0, valor: 0,
    }));
    negsAno.forEach(n => {
      const d = parseDate(n.data);
      if (!d) return;
      months[d.getMonth()].iniciadas++;
      if (n.status === 'fechada') {
        months[d.getMonth()].fechadas++;
        months[d.getMonth()].valor += getValorProposta(n);
      }
    });
    return months;
  }, [negsAno]);

  // ── Dados por vendedor (admin — todos; não-admin — só o próprio) ──────
  const vendedorData = useMemo(() => {
    const map: Record<string, { nome: string; total: number; fechadas: number; valor: number }> = {};
    negsAno.forEach(n => {
      const id = n.responsavelId || 'sem';
      const u  = users.find(u => u.id === id);
      if (!map[id]) map[id] = { nome: u?.nome || 'Sem responsável', total: 0, fechadas: 0, valor: 0 };
      map[id].total++;
      if (n.status === 'fechada') {
        map[id].fechadas++;
        map[id].valor += getValorProposta(n);
      }
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor);
  }, [negsAno, users]);

  // ── Projetos fechados ─────────────────────────────────────────────────
  const produtosData = useMemo(() => {
    const map: Record<string, { titulo: string; count: number; valor: number }> = {};
    fechadasP.forEach(n => {
      const key = n.titulo?.split('—')[0]?.trim() || n.titulo || 'Outros';
      if (!map[key]) map[key] = { titulo: key, count: 0, valor: 0 };
      map[key].count++;
      map[key].valor += getValorProposta(n);
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [fechadasP]);

  // ── Indicações ────────────────────────────────────────────────────────
  const indicacoesData = useMemo(() => {
    // Agrupa por nome do indicador em todas as negociações do período
    const map: Record<string, {
      nome: string; parceiroId: string;
      indicacoes: number; fechadas: number;
      valorProduto: number; valorServico: number; valorTotal: number;
      comissaoProduto: number; comissaoServico: number; comissaoTotal: number;
    }> = {};

    negsPeriodo.forEach(n => {
      const nome = (n as any).indicacaoNome || '';
      const pid  = (n as any).indicacaoId  || '';
      if (!nome) return;
      if (!map[nome]) {
        map[nome] = {
          nome, parceiroId: pid,
          indicacoes: 0, fechadas: 0,
          valorProduto: 0, valorServico: 0, valorTotal: 0,
          comissaoProduto: 0, comissaoServico: 0, comissaoTotal: 0,
        };
      }
      map[nome].indicacoes++;
      if (n.status === 'fechada') {
        map[nome].fechadas++;
        // Busca produto e serviço separados da proposta
        try {
          const salvo = DB.get<any>(`proposta_${n.id}`);
          if (salvo && salvo.length > 0) {
            const secoes = salvo[0].secoes || [];
            secoes.forEach((s: any) => {
              const prod = s.itens?.reduce((a: number, i: any) => a + (i.qtd * i.valorUnd), 0) || 0;
              const serv = s.servicoValor || 0;
              map[nome].valorProduto  += prod;
              map[nome].valorServico  += serv;
              map[nome].valorTotal    += prod + serv;
              map[nome].comissaoProduto += prod * 0.05;
              map[nome].comissaoServico += serv * 0.10;
              map[nome].comissaoTotal   += prod * 0.05 + serv * 0.10;
            });
          }
        } catch {}
      }
    });

    const arr = Object.values(map);
    if (indSort === 'indicacoes') return arr.sort((a, b) => b.indicacoes - a.indicacoes);
    return arr.sort((a, b) => b.valorTotal - a.valorTotal);
  }, [negsPeriodo, indSort]);

  // ── Anos disponíveis ──────────────────────────────────────────────────
  const years = useMemo(() => {
    const ys = new Set(allNegs.map(n => parseDate(n.data)?.getFullYear()).filter(Boolean) as number[]);
    ys.add(new Date().getFullYear());
    return [...ys].sort((a, b) => b - a);
  }, [allNegs]);

  // ── Exports ───────────────────────────────────────────────────────────
  const exportNegs = () => exportCSV(`negociacoes_${periodo}_${ano}.csv`, negsPeriodo.map(n => ({
    Código: n.codigo, Título: n.titulo, Cliente: n.clienteNome || '',
    Responsável: n.responsavelNome || '', Valor: getValorProposta(n),
    Status: STATUS_LABELS[n.status] || n.status, Data: fmtDate(n.data),
    Indicação: (n as any).indicacaoNome || '',
  })));

  const exportVendedores = () => exportCSV(`vendedores_${ano}.csv`, vendedorData.map(v => ({
    Vendedor: v.nome, 'Total negoc.': v.total, Fechadas: v.fechadas,
    'Faturado R$': v.valor, 'Conversão %': v.total ? Math.round((v.fechadas / v.total) * 100) : 0,
    'Ticket médio R$': v.fechadas ? Math.round(v.valor / v.fechadas) : 0,
  })));

  const exportIndicacoes = () => exportCSV(`indicacoes_${periodo}_${ano}.csv`, indicacoesData.map(i => ({
    Parceiro: i.nome, Indicações: i.indicacoes, Fechadas: i.fechadas,
    'Valor produto R$': i.valorProduto, 'Valor serviço R$': i.valorServico,
    'Total faturado R$': i.valorTotal,
    'Comissão produto (5%) R$': i.comissaoProduto,
    'Comissão serviço (10%) R$': i.comissaoServico,
    'Comissão total R$': i.comissaoTotal,
  })));

  // ── Label do período atual ────────────────────────────────────────────
  const periodoLabel = useMemo(() => {
    switch (periodo) {
      case 'anual':      return `${ano}`;
      case 'semestral':  return `${mes < 6 ? '1º' : '2º'} semestre ${ano}`;
      case 'trimestral': return `${Math.floor(mes / 3) + 1}º trimestre ${ano}`;
      case 'mensal':     return `${MONTHS_PT[mes]}/${ano}`;
      case 'semanal':    return `Semana atual — ${MONTHS_PT[mes]}/${ano}`;
    }
  }, [periodo, ano, mes]);

  const tabs = isAdmin
    ? [TABS_BASE[0], TAB_VENDEDOR, ...TABS_BASE.slice(1)]
    : TABS_BASE;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="RELATÓ" titleEm="RIOS" sub="Análise comercial e exportação de dados">
        <div className="flex items-center gap-2 flex-wrap">

          {/* Filtro por vendedor — apenas admin */}
          {isAdmin && (
            <select
              value={filterUid}
              onChange={e => setFilterUid(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-foreground text-xs"
            >
              <option value="all">Todos os vendedores</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          )}

          {/* Período */}
          <select
            value={periodo}
            onChange={e => setPeriodo(e.target.value as Periodo)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-foreground text-xs"
          >
            {(Object.entries(PERIODO_LABELS) as [Periodo, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* Mês — para períodos que precisam */}
          {(periodo === 'mensal' || periodo === 'semanal' || periodo === 'trimestral' || periodo === 'semestral') && (
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              className="bg-card border border-border rounded-lg px-3 py-2 text-foreground text-xs"
            >
              {MONTHS_PT.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          )}

          {/* Ano */}
          <select
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            className="bg-card border border-border rounded-lg px-3 py-2 text-foreground text-xs"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <Btn onClick={exportNegs}>↓ CSV</Btn>
        </div>
      </PageHeader>

      {/* Badge do período selecionado */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs bg-ast-bg3 border border-border rounded-full px-3 py-1 text-ast-text2">
          📅 {PERIODO_LABELS[periodo]}: <strong className="text-foreground">{periodoLabel}</strong>
        </span>
        {!isAdmin && (
          <span className="text-xs bg-ast-bg3 border border-border rounded-full px-3 py-1 text-ast-text3">
            👤 Exibindo apenas seus dados
          </span>
        )}
        {isAdmin && filterUid !== 'all' && (
          <span className="text-xs bg-primary/10 border border-primary/30 rounded-full px-3 py-1 text-primary">
            Filtrado: {users.find(u => u.id === filterUid)?.nome}
          </span>
        )}
        <span className="text-xs text-ast-text3">
          {negsPeriodo.length} negociação(ões) no período
        </span>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {/* ══ VISÃO GERAL ══════════════════════════════════════════════════ */}
      {tab === 'visao' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
            <KPI label="Negociações"  value={negsPeriodo.length}     sub={periodoLabel}              accent="#378ADD" />
            <KPI label="Fechadas"     value={fechadasP.length}       sub={`${taxaConv}% conversão`}  accent="#639922" />
            <KPI label="Perdidas"     value={perdidasP.length}       sub="no período"                accent="#E24B4A" />
            <KPI label="Faturado"     value={`R$ ${fmt(totalFat)}`}  sub="contratos fechados"        accent="#1D9E75" />
            <KPI label="Ticket médio" value={`R$ ${fmt(ticketMed)}`} sub="por negócio"               accent="#7F77DD" />
            <KPI label="Pipeline"     value={`R$ ${fmt(pipeline)}`}  sub="valor em aberto"           accent="#EF9F27" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Section title="Distribuição por status">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusDist} dataKey="count" nameKey="label"
                    cx="50%" cy="50%" outerRadius={75}
                    label={({ label, percent }) => `${label} ${Math.round(percent * 100)}%`}
                    labelLine={false} fontSize={10}
                  >
                    {statusDist.map((e, i) => (
                      <Cell key={i} fill={STATUS_COLORS[e.status] || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} negociação(s)`, 'Qtd']} />
                </PieChart>
              </ResponsiveContainer>
            </Section>

            <Section title="Valor faturado por mês">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mensalData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : String(v)} />
                  <Tooltip formatter={(v: number) => [`R$ ${fmt(v)}`, 'Faturado']} />
                  <Bar dataKey="valor" fill="#639922" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>

          <Section
            title={`Top negociações — ${periodoLabel}`}
            action={<Btn variant="secondary" sm onClick={exportNegs}>↓ CSV</Btn>}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    {['Código','Cliente','Título','Valor','Status','Vendedor','Data'].map(h => (
                      <TH key={h}>{h}</TH>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...negsPeriodo]
                    .sort((a, b) => getValorProposta(b) - getValorProposta(a))
                    .slice(0, 10)
                    .map(n => (
                      <tr key={n.id} className="hover:bg-ast-bg3">
                        <TD><strong className="text-foreground">{n.codigo}</strong></TD>
                        <TD>{n.clienteNome || '—'}</TD>
                        <TD className="max-w-[160px]"><span className="truncate block">{n.titulo}</span></TD>
                        <TD><strong className="text-primary">R$ {fmt(getValorProposta(n))}</strong></TD>
                        <TD>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: (STATUS_COLORS[n.status] || '#888') + '22', color: STATUS_COLORS[n.status] || '#888' }}>
                            {STATUS_LABELS[n.status] || n.status}
                          </span>
                        </TD>
                        <TD>{n.responsavelNome || '—'}</TD>
                        <TD>{fmtDate(n.data)}</TD>
                      </tr>
                    ))}
                  {!negsPeriodo.length && (
                    <tr><td colSpan={7} className="text-center text-ast-text3 py-8">Nenhuma negociação no período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {/* ══ POR VENDEDOR (apenas admin) ══════════════════════════════════ */}
      {tab === 'vendedor' && isAdmin && (
        <>
          {/* Pódio dos maiores vendedores */}
          {vendedorData.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {vendedorData.slice(0, 3).map((v, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: i === 0 ? '#EF9F27' : i === 1 ? '#9E9E9E' : '#CD7F32' }} />
                  <div className="text-2xl mb-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                  <div className="font-bold text-foreground text-sm">{v.nome}</div>
                  <div className="text-primary font-black text-lg mt-1">R$ {fmt(v.valor)}</div>
                  <div className="text-[10px] text-ast-text3 mt-1">
                    {v.fechadas} fechada(s) · {v.total ? Math.round((v.fechadas / v.total) * 100) : 0}% conversão
                  </div>
                </div>
              ))}
            </div>
          )}

          <Section title="Faturado por vendedor" action={<Btn variant="secondary" sm onClick={exportVendedores}>↓ CSV</Btn>}>
            <ResponsiveContainer width="100%" height={Math.max(200, vendedorData.length * 48 + 40)}>
              <BarChart data={vendedorData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }}
                  tickFormatter={v => `R$ ${v >= 1000 ? Math.round(v/1000)+'k' : v}`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v: number) => [`R$ ${fmt(v)}`, 'Faturado']} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {vendedorData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>

          <div className="overflow-x-auto bg-card border border-border rounded-xl mb-4">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  {['#','Vendedor','Total negoc.','Fechadas','Faturado','Taxa conv.','Ticket médio'].map(h => (
                    <TH key={h}>{h}</TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendedorData.map((v, i) => {
                  const conv   = v.total ? Math.round((v.fechadas / v.total) * 100) : 0;
                  const ticket = v.fechadas ? Math.round(v.valor / v.fechadas) : 0;
                  return (
                    <tr key={i} className="hover:bg-ast-bg3">
                      <TD><span className="font-bold text-ast-text3">{i + 1}</span></TD>
                      <TD><strong className="text-foreground">{v.nome}</strong></TD>
                      <TD>{v.total}</TD>
                      <TD><span className="text-ast-green font-semibold">{v.fechadas}</span></TD>
                      <TD><strong className="text-primary">R$ {fmt(v.valor)}</strong></TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-ast-bg4 rounded-full overflow-hidden max-w-[60px]">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${conv}%` }} />
                          </div>
                          <span className="text-[11px] text-foreground font-semibold">{conv}%</span>
                        </div>
                      </TD>
                      <TD>R$ {fmt(ticket)}</TD>
                    </tr>
                  );
                })}
                {!vendedorData.length && (
                  <tr><td colSpan={7} className="text-center text-ast-text3 py-8">Sem dados no período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ EVOLUÇÃO MENSAL ══════════════════════════════════════════════ */}
      {tab === 'mensal' && (
        <>
          <Section title="Negociações iniciadas vs fechadas por mês">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mensalData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="iniciadas" fill="#378ADD" radius={[4,4,0,0]} name="Iniciadas" />
                <Bar dataKey="fechadas"  fill="#639922" radius={[4,4,0,0]} name="Fechadas" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </Section>

          <Section title="Evolução do faturamento mensal">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mensalData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : String(v)} />
                <Tooltip formatter={(v: number) => [`R$ ${fmt(v)}`, 'Faturado']} />
                <Line type="monotone" dataKey="valor" stroke="#639922" strokeWidth={2}
                  dot={{ r: 3, fill: '#639922' }} name="Faturado (R$)" />
              </LineChart>
            </ResponsiveContainer>
          </Section>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[10px] text-ast-text3 tracking-[0.8px] uppercase">Detalhamento mensal — {ano}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    {['Mês','Iniciadas','Fechadas','Faturado','Taxa conv.'].map(h => <TH key={h}>{h}</TH>)}
                  </tr>
                </thead>
                <tbody>
                  {mensalData.map((m, i) => {
                    const conv = m.iniciadas ? Math.round((m.fechadas / m.iniciadas) * 100) : 0;
                    return (
                      <tr key={i} className={m.valor > 0 ? 'hover:bg-ast-bg3' : 'opacity-50'}>
                        <TD><strong className="text-foreground">{m.mes}</strong></TD>
                        <TD>{m.iniciadas}</TD>
                        <TD><span className="text-ast-green font-semibold">{m.fechadas}</span></TD>
                        <TD><span className="font-semibold text-primary">{m.valor > 0 ? `R$ ${fmt(m.valor)}` : '—'}</span></TD>
                        <TD>{m.iniciadas > 0 ? `${conv}%` : '—'}</TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══ PROJETOS / PRODUTOS ══════════════════════════════════════════ */}
      {tab === 'produtos' && (
        <>
          <Section title="Projetos fechados por tipo">
            {produtosData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(180, produtosData.length * 40 + 40)}>
                <BarChart data={produtosData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }}
                    tickFormatter={v => `R$ ${v >= 1000 ? Math.round(v/1000)+'k' : v}`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="titulo" tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false} tickLine={false} width={140} />
                  <Tooltip formatter={(v: number) => [`R$ ${fmt(v)}`, 'Faturado']} />
                  <Bar dataKey="valor" radius={[0,4,4,0]}>
                    {produtosData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-ast-text3 py-8 text-[12px]">Nenhum negócio fechado no período</div>
            )}
          </Section>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <span className="text-[10px] text-ast-text3 tracking-[0.8px] uppercase">Ranking de projetos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    {['#','Tipo de projeto','Qtd fechados','Faturado','Ticket médio'].map(h => <TH key={h}>{h}</TH>)}
                  </tr>
                </thead>
                <tbody>
                  {produtosData.map((p, i) => (
                    <tr key={i} className="hover:bg-ast-bg3">
                      <TD><span className="font-bold text-ast-text3">{i + 1}</span></TD>
                      <TD><strong className="text-foreground">{p.titulo}</strong></TD>
                      <TD>{p.count}</TD>
                      <TD><strong className="text-primary">R$ {fmt(p.valor)}</strong></TD>
                      <TD>R$ {fmt(Math.round(p.valor / p.count))}</TD>
                    </tr>
                  ))}
                  {!produtosData.length && (
                    <tr><td colSpan={5} className="text-center text-ast-text3 py-8">Sem dados no período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══ INDICAÇÕES ═══════════════════════════════════════════════════ */}
      {tab === 'indicacoes' && (
        <>
          {/* KPIs de indicações */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            <KPI label="Parceiros ativos"
              value={indicacoesData.length}
              sub="com indicações no período" accent="#EF9F27" />
            <KPI label="Total indicações"
              value={indicacoesData.reduce((s, i) => s + i.indicacoes, 0)}
              sub="negociações originadas" accent="#378ADD" />
            <KPI label="Faturado p/ indicação"
              value={`R$ ${fmt(indicacoesData.reduce((s, i) => s + i.valorTotal, 0))}`}
              sub="em contratos fechados" accent="#639922" />
            <KPI label="Total a comissionar"
              value={`R$ ${fmt(indicacoesData.reduce((s, i) => s + i.comissaoTotal, 0))}`}
              sub="5% produto · 10% serviço" accent="#E24B4A" />
          </div>

          {/* Gráfico de indicações */}
          {indicacoesData.length > 0 && (
            <Section title="Valor faturado por parceiro">
              <ResponsiveContainer width="100%" height={Math.max(180, indicacoesData.length * 44 + 40)}>
                <BarChart data={indicacoesData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }}
                    tickFormatter={v => `R$ ${v >= 1000 ? Math.round(v/1000)+'k' : v}`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false} tickLine={false} width={130} />
                  <Tooltip formatter={(v: number) => [`R$ ${fmt(v)}`, '']} />
                  <Bar dataKey="valorTotal" name="Faturado" radius={[0,4,4,0]}>
                    {indicacoesData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>
          )}

          {/* Tabela de indicações */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] text-ast-text3 tracking-[0.8px] uppercase">Relatório de parceiros / indicações</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-ast-text3">Ordenar por:</span>
                <button
                  onClick={() => setIndSort('valor')}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${indSort === 'valor' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-ast-text3 hover:text-foreground'}`}
                >
                  R$ Valor
                </button>
                <button
                  onClick={() => setIndSort('indicacoes')}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${indSort === 'indicacoes' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-ast-text3 hover:text-foreground'}`}
                >
                  Nº Indicações
                </button>
                <Btn variant="secondary" sm onClick={exportIndicacoes}>↓ CSV</Btn>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    {['#','Parceiro','Indicações','Fechadas','Valor produto','Valor serviço','Total faturado','Comissão (5%+10%)'].map(h => (
                      <TH key={h}>{h}</TH>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {indicacoesData.map((ind, i) => (
                    <tr key={i} className="hover:bg-ast-bg3">
                      <TD><span className="font-bold text-ast-text3">{i + 1}</span></TD>
                      <TD>
                        <div>
                          <strong className="text-foreground">{ind.nome}</strong>
                          {parceiros.find(p => p.id === ind.parceiroId)?.tipo && (
                            <div className="text-[10px] text-ast-text3">
                              {parceiros.find(p => p.id === ind.parceiroId)?.tipo}
                            </div>
                          )}
                        </div>
                      </TD>
                      <TD>
                        <span className="font-semibold text-foreground">{ind.indicacoes}</span>
                      </TD>
                      <TD>
                        <span className="text-ast-green font-semibold">{ind.fechadas}</span>
                      </TD>
                      <TD>R$ {fmt(ind.valorProduto)}</TD>
                      <TD>R$ {fmt(ind.valorServico)}</TD>
                      <TD><strong className="text-primary">R$ {fmt(ind.valorTotal)}</strong></TD>
                      <TD>
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-ast-text2">Prod: R$ {fmt(ind.comissaoProduto)}</div>
                          <div className="text-[10px] text-ast-text2">Serv: R$ {fmt(ind.comissaoServico)}</div>
                          <div className="font-bold text-amber-400">= R$ {fmt(ind.comissaoTotal)}</div>
                        </div>
                      </TD>
                    </tr>
                  ))}
                  {!indicacoesData.length && (
                    <tr>
                      <td colSpan={8} className="text-center text-ast-text3 py-10">
                        <div className="text-2xl mb-2">🤝</div>
                        <div>Nenhuma indicação no período selecionado</div>
                        <div className="text-[11px] mt-1">Registre indicações no cadastro de negociações ou leads</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
