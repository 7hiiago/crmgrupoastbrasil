import React, { useState } from 'react';
import { DB, fmt } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { Negociacao, User } from '@/lib/types';
import { StatusBadge } from '@/components/UIComponents';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── KPI Card ────────────────────────────────────────────────────────────────
const ACCENT_COLORS: Record<string, string> = {
  blue:   '#378ADD',
  amber:  '#EF9F27',
  green:  '#639922',
  red:    '#E24B4A',
  purple: '#7F77DD',
  teal:   '#1D9E75',
};

const VALUE_COLORS: Record<string, string> = {
  blue:   '#378ADD',
  amber:  '#BA7517',
  green:  '#639922',
  red:    '#E24B4A',
  purple: '#7F77DD',
  teal:   '#1D9E75',
};

function KPI({ label, value, sub, accent = 'blue' }: {
  label: string; value: string | number; sub: string; accent?: string;
}) {
  return (
    <div className="relative bg-card border border-border rounded-xl px-4 py-3.5 overflow-hidden">
      <div className="absolute top-0 left-0 w-[3px] h-full rounded-l-xl" style={{ background: ACCENT_COLORS[accent] }} />
      <div className="text-[10px] text-ast-text3 tracking-[0.8px] uppercase mb-2">{label}</div>
      <div className="font-condensed text-[22px] font-black leading-none" style={{ color: VALUE_COLORS[accent] }}>
        {value}
      </div>
      <div className="text-[10px] text-ast-text2 mt-1.5">{sub}</div>
    </div>
  );
}

const STATUS_CHART_CONFIG = [
  { key: 'contato',      label: 'Contato',   fill: '#378ADD' },
  { key: 'levantamento', label: 'Levantam.', fill: '#1D9E75' },
  { key: 'proposta',     label: 'Proposta',  fill: '#EF9F27' },
  { key: 'negociacao',   label: 'Negoc.',    fill: '#7F77DD' },
  { key: 'fechada',      label: 'Fechada',   fill: '#639922' },
];

const getValorProposta = (n: Negociacao): number => {
  try {
    const salvo = DB.get<any>(`proposta_${n.id}`);
    if (salvo && salvo.length > 0) {
      const secoes = salvo[0].secoes || [];
      const total = secoes.reduce((acc: number, s: any) => {
        const produto = s.itens?.reduce((a: number, i: any) => a + (i.qtd * i.valorUnd), 0) || 0;
        return acc + produto + (s.servicoValor || 0);
      }, 0);
      if (total > 0) return total;
    }
  } catch {}
  return n.valor || 0;
};

export default function DashboardPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user, isAdmin } = useAuth();
  // Admin pode filtrar por vendedor; não-admin vê apenas os próprios dados
  const [filterUid, setFilterUid] = useState(isAdmin ? 'all' : user?.id || 'all');

  const allNegs = DB.get<Negociacao>('negociacoes');
  const leads   = DB.get<{ status: string }>('leads');
  const users   = DB.get<User>('users').filter(u => u.ativo !== false);

  // Não-admin: sempre filtra pelo próprio ID, ignora o select
  const effectiveUid = isAdmin ? filterUid : (user?.id || 'all');
  const filtered = effectiveUid === 'all'
    ? allNegs
    : allNegs.filter(n => n.responsavelId === effectiveUid);

  const now    = new Date();
  const thisM  = now.getMonth();
  const thisY  = now.getFullYear();
  const isThisMonth = (d: string) => {
    const dt = new Date(d);
    return dt.getMonth() === thisM && dt.getFullYear() === thisY;
  };

  const abertas      = filtered.filter(n => !['fechada', 'perdida'].includes(n.status));
  const valAberto    = abertas.reduce((s, n) => s + getValorProposta(n), 0);
  const fechadas     = filtered.filter(n => n.status === 'fechada');
  const totalFechado = fechadas.reduce((s, n) => s + getValorProposta(n), 0);
  const ticketMed    = fechadas.length ? Math.round(totalFechado / fechadas.length) : 0;
  const mesIniciadas = filtered.filter(n => isThisMonth(n.data)).length;
  const mesFechadas  = filtered.filter(n => n.status === 'fechada' && isThisMonth(n.data)).length;
  const leadsNew     = leads.filter(l => l.status === 'novo').length;
  const total        = filtered.length;
  const convGeral    = total ? Math.round((fechadas.length / total) * 100) : 0;
  const totalMes     = filtered.filter(n => isThisMonth(n.data)).length;
  const convMes      = totalMes ? Math.round((mesFechadas / totalMes) * 100) : 0;

  const selectedUser = effectiveUid !== 'all' ? users.find(u => u.id === effectiveUid) : user;
  const metaReais = selectedUser?.metaReais || 0;
  const metaPct   = metaReais > 0 ? Math.min(Math.round((totalFechado / metaReais) * 100), 100) : 0;

  const recent = [...filtered]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 6);

  const chartData = STATUS_CHART_CONFIG.map(s => ({
    label: s.label,
    fill:  s.fill,
    count: filtered.filter(n => n.status === s.key).length,
  }));

  return (
    <div>
      {/* ── Top bar ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-condensed text-[28px] font-black tracking-[-0.5px] leading-none">
            DASH<span className="text-primary">BOARD</span>
          </div>
          <div className="text-[11px] text-ast-text3 mt-1 tracking-wide">
            {isAdmin
              ? 'Visão geral do departamento comercial'
              : `Seus números — ${user?.nome || ''}`}
          </div>
        </div>
        {/* Filtro por vendedor: apenas admin vê */}
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
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
        <KPI label="Em negociação"   value={abertas.length}        sub={`R$ ${fmt(valAberto)} em aberto`}                accent="blue"   />
        <KPI label="Iniciadas no mês" value={mesIniciadas}          sub={now.toLocaleString('pt-BR', { month: 'long' })}  accent="amber"  />
        <KPI label="Fechadas no mês"  value={mesFechadas}           sub={mesFechadas > 0 ? '✓ Bom desempenho' : 'Nenhuma ainda'} accent="green" />
        <KPI label="Leads a validar"  value={leadsNew}              sub="Aguardando qualificação"                          accent={leadsNew > 0 ? 'red' : 'blue'} />
        <KPI label="Ticket médio"     value={`R$ ${fmt(ticketMed)}`} sub={`${fechadas.length} vendas fechadas`}            accent="purple" />
        <KPI label="Conversão geral"  value={`${convGeral}%`}       sub={`Mês: ${convMes}%`}                              accent={convGeral >= 50 ? 'teal' : 'amber'} />
      </div>

      {/* ── Meta + Gráfico ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[10px] text-ast-text3 tracking-[0.8px] uppercase mb-4">Meta do mês</div>
          <div className="flex justify-between text-[11px] text-ast-text2 mb-1.5">
            <span>R$ {fmt(totalFechado)} realizado</span>
            <span>Meta: R$ {fmt(metaReais)}</span>
          </div>
          <div className="h-1.5 bg-ast-bg4 rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${metaPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-ast-text3">
            <span className="font-semibold text-primary">{metaPct}%</span>
            <span>Meta mensal</span>
          </div>
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2">
            {[
              { label: 'Total aberto',  val: `R$ ${fmt(valAberto)}` },
              { label: 'Total fechado', val: `R$ ${fmt(totalFechado)}` },
              { label: 'Negoc. ativas', val: String(abertas.length) },
            ].map(item => (
              <div key={item.label}>
                <div className="text-[9px] text-ast-text3 uppercase tracking-wider">{item.label}</div>
                <div className="text-[13px] font-semibold text-foreground mt-0.5">{item.val}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[10px] text-ast-text3 tracking-[0.8px] uppercase mb-3">Negociações por status</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} barSize={22} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--background)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'rgba(128,128,128,0.06)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Negociações recentes ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="text-[10px] text-ast-text3 tracking-[0.8px] uppercase">Negociações recentes</span>
          <button
            className="text-[11px] text-ast-text2 hover:text-foreground transition-colors"
            onClick={() => onNavigate('negociacoes')}
          >
            Ver todas →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {['Código', 'Cliente', 'Título', 'Valor', 'Vendedor', 'Status'].map(h => (
                  <th key={h} className="bg-ast-bg3 text-ast-text3 text-[9px] tracking-[0.6px] px-4 py-2.5 text-left font-medium uppercase border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(n => (
                <tr key={n.id} className="hover:bg-ast-bg3 cursor-pointer transition-colors" onClick={() => onNavigate('negociacoes')}>
                  <td className="px-4 py-2.5 border-b border-border font-semibold text-foreground text-[11px]">{n.codigo}</td>
                  <td className="px-4 py-2.5 border-b border-border text-ast-text2">{n.clienteNome || '—'}</td>
                  <td className="px-4 py-2.5 border-b border-border text-ast-text2 hidden sm:table-cell">{n.titulo}</td>
                  <td className="px-4 py-2.5 border-b border-border font-semibold text-primary">
                    R$ {fmt(getValorProposta(n))}
                  </td>
                  <td className="px-4 py-2.5 border-b border-border text-ast-text2 hidden md:table-cell">
                    {n.responsavelNome || '—'}
                  </td>
                  <td className="px-4 py-2.5 border-b border-border">
                    <StatusBadge status={n.status} />
                  </td>
                </tr>
              ))}
              {!recent.length && (
                <tr>
                  <td colSpan={6} className="text-center text-ast-text3 py-10 text-[12px]">
                    Nenhuma negociação cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
