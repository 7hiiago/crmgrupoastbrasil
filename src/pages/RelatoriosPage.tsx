import React, { useState, useMemo } from 'react';
import { DB, fmt, fmtDate } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { Negociacao, User, Cliente } from '@/lib/types';
import { PageHeader, Tabs, Btn } from '@/components/UIComponents';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function parseMonth(dateStr: string) {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : { m: d.getMonth(), y: d.getFullYear() };
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

// ─── KPI card ────────────────────────────────────────────────────────────────
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

// ─── Section card ────────────────────────────────────────────────────────────
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
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

const CHART_COLORS = ['#378ADD','#639922','#EF9F27','#E24B4A','#7F77DD','#1D9E75'];
const STATUS_COLORS: Record<string, string> = {
  contato: '#378ADD', levantamento: '#1D9E75', proposta: '#EF9F27',
  negociacao: '#7F77DD', fechada: '#639922', perdida: '#E24B4A',
};
const STATUS_LABELS: Record<string, string> = {
  contato: 'Contato', levantamento: 'Levantamento', proposta: 'Proposta',
  negociacao: 'Em negociação', fechada: 'Fechada', perdida: 'Perdida',
};

const TABS = [
  { key: 'visao',    label: 'Visão Geral' },
  { key: 'vendedor', label: 'Por Vendedor' },
  { key: 'mensal',   label: 'Evolução Mensal' },
  { key: 'produtos', label: 'Produtos/Serviços' },
];

// ─── Main ────────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('visao');
  const [ano, setAno] = useState(new Date().getFullYear());

  const negs     = DB.get<Negociacao>('negociacoes');
  const users    = DB.get<User>('users');
  const clientes = DB.get<Cliente>('clientes');

  const negAno = useMemo(() =>
    negs.filter(n => {
      const p = parseMonth(n.data);
      return p?.y === ano;
    }),
    [negs, ano]
  );

  // ── Visão Geral ────────────────────────────────────────────────────────────
  const totalNegs    = negAno.length;
  const fechadas     = negAno.filter(n => n.status === 'fechada');
  const perdidas     = negAno.filter(n => n.status === 'perdida');
  const totalFaturado = fechadas.reduce((s, n) => s + (n.valor || 0), 0);
  const ticketMedio  = fechadas.length ? Math.round(totalFaturado / fechadas.length) : 0;
  const taxaConv     = totalNegs ? Math.round((fechadas.length / totalNegs) * 100) : 0;
  const pipeline     = negAno.filter(n => !['fechada','perdida'].includes(n.status))
                             .reduce((s, n) => s + (n.valor || 0), 0);

  // Status distribution (pie)
  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    negAno.forEach(n => { map[n.status] = (map[n.status] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ status, count, label: STATUS_LABELS[status] || status }));
  }, [negAno]);

  // ── Por Vendedor ───────────────────────────────────────────────────────────
  const vendedorData = useMemo(() => {
    const map: Record<string, { nome: string; total: number; fechadas: number; valor: number }> = {};
    negAno.forEach(n => {
      const id = n.responsavelId || 'sem';
      const u  = users.find(u => u.id === id);
      if (!map[id]) map[id] = { nome: u?.nome || 'Sem responsável', total: 0, fechadas: 0, valor: 0 };
      map[id].total++;
      if (n.status === 'fechada') { map[id].fechadas++; map[id].valor += n.valor || 0; }
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor);
  }, [negAno, users]);

  // ── Evolução Mensal ────────────────────────────────────────────────────────
  const mensalData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      mes: MONTHS_PT[i],
      iniciadas: 0, fechadas: 0, valor: 0,
    }));
    negAno.forEach(n => {
      const p = parseMonth(n.data);
      if (!p) return;
      months[p.m].iniciadas++;
      if (n.status === 'fechada') { months[p.m].fechadas++; months[p.m].valor += n.valor || 0; }
    });
    return months;
  }, [negAno]);

  // ── Produtos / Origem ──────────────────────────────────────────────────────
  const produtosData = useMemo(() => {
    const map: Record<string, { titulo: string; count: number; valor: number }> = {};
    fechadas.forEach(n => {
      const key = n.titulo?.split('—')[0]?.trim() || n.titulo || 'Outros';
      if (!map[key]) map[key] = { titulo: key, count: 0, valor: 0 };
      map[key].count++;
      map[key].valor += n.valor || 0;
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [fechadas]);

  // ── Export handlers ────────────────────────────────────────────────────────
  const exportNegs = () => exportCSV(`negociacoes_${ano}.csv`, negAno.map(n => ({
    Código: n.codigo,
    Título: n.titulo,
    Cliente: n.clienteNome || '',
    Responsável: n.responsavelNome || '',
    Valor: n.valor || 0,
    Status: STATUS_LABELS[n.status] || n.status,
    Data: fmtDate(n.data),
    Probabilidade: `${n.prob || 0}%`,
  })));

  const exportVendedores = () => exportCSV(`vendedores_${ano}.csv`, vendedorData.map(v => ({
    Vendedor: v.nome,
    'Total negociações': v.total,
    'Fechadas': v.fechadas,
    'Faturado (R$)': v.valor,
    'Taxa conversão (%)': v.total ? Math.round((v.fechadas / v.total) * 100) : 0,
  })));

  const years = [ano - 1, ano, ano + 1].filter(y => y <= new Date().getFullYear() + 1);

  return (
    <div>
      <PageHeader title="RELATÓ" titleEm="RIOS" sub="Análise comercial e exportação de dados">
        <div className="flex items-center gap-2">
          <select
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            className="bg-card border border-border rounded-lg px-3 py-2 text-foreground text-xs"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Btn onClick={exportNegs}>↓ Exportar CSV</Btn>
        </div>
      </PageHeader>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ── VISÃO GERAL ─────────────────────────────────────────────────── */}
      {tab === 'visao' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
            <KPI label="Negociações" value={totalNegs} sub={`em ${ano}`} accent="#378ADD" />
            <KPI label="Fechadas" value={fechadas.length} sub={`${taxaConv}% de conversão`} accent="#639922" />
            <KPI label="Perdidas" value={perdidas.length} sub="no período" accent="#E24B4A" />
            <KPI label="Faturado" value={`R$ ${fmt(totalFaturado)}`} sub="contratos fechados" accent="#1D9E75" />
            <KPI label="Ticket médio" value={`R$ ${fmt(ticketMedio)}`} sub="por negócio fechado" accent="#7F77DD" />
            <KPI label="Pipeline" value={`R$ ${fmt(pipeline)}`} sub="valor em aberto" accent="#EF9F27" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Section title="Distribuição por status">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusDist} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={75} label={({ label, percent }) => `${label} ${Math.round(percent * 100)}%`} labelLine={false} fontSize={10}>
                    {statusDist.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || CHART_COLORS[i % CHART_COLORS.length]} />
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
                  <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                  <Tooltip formatter={(v: number) => [`R$ ${fmt(v)}`, 'Faturado']} />
                  <Bar dataKey="valor" fill="#639922" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>

          {/* Top clientes */}
          <Section
            title="Top 10 negociações do período"
            action={<Btn variant="secondary" sm onClick={exportNegs}>↓ CSV</Btn>}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    {['Código','Cliente','Título','Valor','Status','Responsável','Data'].map(h => (
                      <th key={h} className="bg-ast-bg3 text-ast-text3 text-[9px] tracking-[0.6px] px-3 py-2 text-left font-medium uppercase border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...negAno]
                    .sort((a, b) => (b.valor || 0) - (a.valor || 0))
                    .slice(0, 10)
                    .map(n => (
                      <tr key={n.id} className="hover:bg-ast-bg3">
                        <td className="px-3 py-2 border-b border-border font-semibold text-foreground">{n.codigo}</td>
                        <td className="px-3 py-2 border-b border-border text-ast-text2">{n.clienteNome || '—'}</td>
                        <td className="px-3 py-2 border-b border-border text-ast-text2 max-w-[160px] truncate">{n.titulo}</td>
                        <td className="px-3 py-2 border-b border-border font-semibold text-primary">R$ {fmt(n.valor || 0)}</td>
                        <td className="px-3 py-2 border-b border-border">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: (STATUS_COLORS[n.status] || '#888') + '22', color: STATUS_COLORS[n.status] || '#888' }}>
                            {STATUS_LABELS[n.status] || n.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-b border-border text-ast-text2">{n.responsavelNome || '—'}</td>
                        <td className="px-3 py-2 border-b border-border text-ast-text2">{fmtDate(n.data)}</td>
                      </tr>
                    ))}
                  {!negAno.length && (
                    <tr><td colSpan={7} className="text-center text-ast-text3 py-8">Nenhuma negociação em {ano}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {/* ── POR VENDEDOR ────────────────────────────────────────────────── */}
      {tab === 'vendedor' && (
        <>
          <Section title="Faturado por vendedor" action={<Btn variant="secondary" sm onClick={exportVendedores}>↓ CSV</Btn>}>
            <ResponsiveContainer width="100%" height={Math.max(200, vendedorData.length * 48 + 40)}>
              <BarChart data={vendedorData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }} tickFormatter={v => `R$ ${v >= 1000 ? Math.round(v/1000)+'k' : v}`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v: number) => [`R$ ${fmt(v)}`, 'Faturado']} />
                <Bar dataKey="valor" fill="#378ADD" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>

          <div className="overflow-x-auto bg-card border border-border rounded-xl">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  {['Vendedor','Total negoc.','Fechadas','Faturado','Taxa conv.','Ticket médio'].map(h => (
                    <th key={h} className="bg-ast-bg3 text-ast-text3 text-[9px] tracking-[0.6px] px-4 py-2.5 text-left font-medium uppercase border-b border-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendedorData.map((v, i) => {
                  const conv   = v.total ? Math.round((v.fechadas / v.total) * 100) : 0;
                  const ticket = v.fechadas ? Math.round(v.valor / v.fechadas) : 0;
                  return (
                    <tr key={i} className="hover:bg-ast-bg3">
                      <td className="px-4 py-2.5 border-b border-border font-semibold text-foreground">{v.nome}</td>
                      <td className="px-4 py-2.5 border-b border-border text-ast-text2">{v.total}</td>
                      <td className="px-4 py-2.5 border-b border-border text-ast-green font-semibold">{v.fechadas}</td>
                      <td className="px-4 py-2.5 border-b border-border font-semibold text-primary">R$ {fmt(v.valor)}</td>
                      <td className="px-4 py-2.5 border-b border-border">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-ast-bg4 rounded-full overflow-hidden max-w-[60px]">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${conv}%` }} />
                          </div>
                          <span className="text-[11px] text-foreground font-semibold">{conv}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 border-b border-border text-ast-text2">R$ {fmt(ticket)}</td>
                    </tr>
                  );
                })}
                {!vendedorData.length && (
                  <tr><td colSpan={6} className="text-center text-ast-text3 py-8">Sem dados em {ano}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── EVOLUÇÃO MENSAL ─────────────────────────────────────────────── */}
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
                <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : String(v)} />
                <Tooltip formatter={(v: number) => [`R$ ${fmt(v)}`, 'Faturado']} />
                <Line type="monotone" dataKey="valor" stroke="#639922" strokeWidth={2} dot={{ r: 3, fill: '#639922' }} name="Faturado (R$)" />
              </LineChart>
            </ResponsiveContainer>
          </Section>

          {/* Tabela mensal */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <span className="text-[10px] text-ast-text3 tracking-[0.8px] uppercase">Detalhamento mensal</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    {['Mês','Iniciadas','Fechadas','Faturado','Taxa conv.'].map(h => (
                      <th key={h} className="bg-ast-bg3 text-ast-text3 text-[9px] tracking-[0.6px] px-4 py-2.5 text-left font-medium uppercase border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mensalData.map((m, i) => {
                    const conv = m.iniciadas ? Math.round((m.fechadas / m.iniciadas) * 100) : 0;
                    return (
                      <tr key={i} className={m.valor > 0 ? 'hover:bg-ast-bg3' : 'opacity-50'}>
                        <td className="px-4 py-2.5 border-b border-border font-semibold text-foreground">{m.mes}</td>
                        <td className="px-4 py-2.5 border-b border-border text-ast-text2">{m.iniciadas}</td>
                        <td className="px-4 py-2.5 border-b border-border text-ast-green font-semibold">{m.fechadas}</td>
                        <td className="px-4 py-2.5 border-b border-border font-semibold text-primary">
                          {m.valor > 0 ? `R$ ${fmt(m.valor)}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 border-b border-border text-ast-text2">
                          {m.iniciadas > 0 ? `${conv}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── PRODUTOS / SERVIÇOS ─────────────────────────────────────────── */}
      {tab === 'produtos' && (
        <>
          <Section title="Negócios fechados por tipo de projeto">
            {produtosData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(180, produtosData.length * 40 + 40)}>
                <BarChart data={produtosData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }} tickFormatter={v => `R$ ${v >= 1000 ? Math.round(v/1000)+'k' : v}`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="titulo" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip formatter={(v: number) => [`R$ ${fmt(v)}`, 'Faturado']} />
                  <Bar dataKey="valor" radius={[0,4,4,0]}>
                    {produtosData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-ast-text3 py-8 text-[12px]">Nenhum negócio fechado em {ano}</div>
            )}
          </Section>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border"><span className="text-[10px] text-ast-text3 tracking-[0.8px] uppercase">Ranking de projetos</span></div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    {['#','Tipo de projeto','Qtd fechados','Faturado','Ticket médio'].map(h => (
                      <th key={h} className="bg-ast-bg3 text-ast-text3 text-[9px] tracking-[0.6px] px-4 py-2.5 text-left font-medium uppercase border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {produtosData.map((p, i) => (
                    <tr key={i} className="hover:bg-ast-bg3">
                      <td className="px-4 py-2.5 border-b border-border text-ast-text3 font-bold">{i + 1}</td>
                      <td className="px-4 py-2.5 border-b border-border font-semibold text-foreground">{p.titulo}</td>
                      <td className="px-4 py-2.5 border-b border-border text-ast-text2">{p.count}</td>
                      <td className="px-4 py-2.5 border-b border-border font-semibold text-primary">R$ {fmt(p.valor)}</td>
                      <td className="px-4 py-2.5 border-b border-border text-ast-text2">R$ {fmt(Math.round(p.valor / p.count))}</td>
                    </tr>
                  ))}
                  {!produtosData.length && (
                    <tr><td colSpan={5} className="text-center text-ast-text3 py-8">Sem dados em {ano}</td></tr>
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
