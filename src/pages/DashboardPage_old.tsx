import React, { useState, useMemo } from 'react';
import { DB, fmt, fmtDate, fmtK } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { Negociacao, User } from '@/lib/types';
import { StatusBadge } from '@/components/UIComponents';

export default function DashboardPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user, isAdmin } = useAuth();
  const [filterUid, setFilterUid] = useState('all');

  const negs = DB.get<Negociacao>('negociacoes');
  const leads = DB.get<{ status: string }>('leads');
  const users = DB.get<User>('users');

  const filtered = filterUid === 'all' ? negs : negs.filter(n => n.responsavelId === filterUid);
  const now = new Date();
  const thisM = now.getMonth();
  const thisY = now.getFullYear();

  const abertas = filtered.filter(n => !['fechada', 'perdida'].includes(n.status));
  const valAberto = abertas.reduce((s, n) => s + (n.valor || 0), 0);
  const mesIniciadas = filtered.filter(n => { const d = new Date(n.data); return d.getMonth() === thisM && d.getFullYear() === thisY; }).length;
  const fechadas = filtered.filter(n => n.status === 'fechada');
  const mesFechadas = filtered.filter(n => { const d = new Date(n.data); return n.status === 'fechada' && d.getMonth() === thisM && d.getFullYear() === thisY; }).length;
  const leadsNew = leads.filter(l => l.status === 'novo').length;
  const ticketMed = fechadas.length ? Math.round(fechadas.reduce((s, n) => s + (n.valor || 0), 0) / fechadas.length) : 0;
  const total = filtered.length;
  const convGeral = total ? Math.round((fechadas.length / total) * 100) : 0;
  const totalMes = filtered.filter(n => { const d = new Date(n.data); return d.getMonth() === thisM && d.getFullYear() === thisY; }).length;
  const convMes = totalMes ? Math.round((mesFechadas / totalMes) * 100) : 0;
  const totalFechado = fechadas.reduce((s, n) => s + (n.valor || 0), 0);

  const selectedUser = filterUid !== 'all' ? users.find(u => u.id === filterUid) : user;
  const metaReais = selectedUser?.metaReais || 0;
  const metaPct = metaReais > 0 ? Math.min(Math.round((totalFechado / metaReais) * 100), 100) : 0;

  const recent = [...filtered].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 6);

  const KPI = ({ label, value, sub, color }: { label: string; value: string | number; sub: string; color?: string }) => (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-[10px] text-ast-text3 tracking-[1.5px] uppercase mb-2">{label}</div>
      <div className={`font-condensed text-[28px] sm:text-[30px] font-black leading-none ${color || 'text-foreground'}`}>{value}</div>
      <div className="text-[11px] text-ast-text3 mt-1">{sub}</div>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-condensed text-[28px] font-black tracking-wider uppercase">
            DASH<span className="text-primary">BOARD</span>
          </div>
          <div className="text-xs text-ast-text3">Visão geral do departamento comercial</div>
        </div>
        {isAdmin && (
          <select
            value={filterUid}
            onChange={e => setFilterUid(e.target.value)}
            className="bg-card border border-border rounded px-3 py-1.5 text-foreground text-xs"
          >
            <option value="all">Todos os usuários</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
        <KPI label="Em negociação" value={abertas.length} sub={`R$ ${fmt(valAberto)} em aberto`} />
        <KPI label="Iniciadas no mês" value={mesIniciadas} sub={now.toLocaleString('pt-BR', { month: 'long' })} color="text-ast-amber" />
        <KPI label="Fechadas no mês" value={mesFechadas} sub={mesFechadas > 0 ? '✓ Bom desempenho' : 'Nenhuma ainda'} color="text-ast-green" />
        <KPI label="Leads a validar" value={leadsNew} sub="Aguardando qualificação" color={leadsNew > 0 ? 'text-primary' : undefined} />
        <KPI label="Ticket médio" value={`R$ ${fmt(ticketMed)}`} sub={`${fechadas.length} vendas fechadas`} />
        <KPI label="Conversão geral" value={`${convGeral}%`} sub={`Mês: ${convMes}%`} color={convGeral >= 50 ? 'text-ast-green' : 'text-ast-amber'} />
      </div>

      {/* Meta progress */}
      <div className="bg-card border border-border rounded-lg p-5 mb-6">
        <div className="text-[11px] text-ast-text3 tracking-[1.5px] uppercase mb-3">Meta do mês</div>
        <div className="flex justify-between text-xs text-ast-text2 mb-1">
          <span>R$ {fmt(totalFechado)} realizado</span>
          <span>Meta: R$ {fmt(metaReais)}</span>
        </div>
        <div className="h-2 bg-ast-bg4 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${metaPct}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-ast-text2 mt-1">
          <span>{metaPct}%</span>
          <span>Meta do mês</span>
        </div>
      </div>

      {/* Recent */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
          <span className="text-[11px] text-ast-text3 tracking-[1.5px] uppercase">Negociações recentes</span>
          <button className="text-xs text-ast-text2 hover:text-foreground" onClick={() => onNavigate('negociacoes')}>Ver todas</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="bg-ast-bg3 text-ast-text3 text-[10px] tracking-wider px-3.5 py-2.5 text-left font-medium uppercase">Código</th>
                <th className="bg-ast-bg3 text-ast-text3 text-[10px] tracking-wider px-3.5 py-2.5 text-left font-medium uppercase">Cliente</th>
                <th className="bg-ast-bg3 text-ast-text3 text-[10px] tracking-wider px-3.5 py-2.5 text-left font-medium uppercase hidden sm:table-cell">Título</th>
                <th className="bg-ast-bg3 text-ast-text3 text-[10px] tracking-wider px-3.5 py-2.5 text-left font-medium uppercase">Valor</th>
                <th className="bg-ast-bg3 text-ast-text3 text-[10px] tracking-wider px-3.5 py-2.5 text-left font-medium uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(n => (
                <tr key={n.id} className="hover:bg-ast-bg3 cursor-pointer" onClick={() => onNavigate('negociacoes')}>
                  <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{n.codigo}</td>
                  <td className="px-3.5 py-2.5 border-b border-border text-ast-text2">{n.clienteNome || '—'}</td>
                  <td className="px-3.5 py-2.5 border-b border-border text-ast-text2 hidden sm:table-cell">{n.titulo}</td>
                  <td className="px-3.5 py-2.5 border-b border-border font-semibold text-primary">R$ {fmt(n.valor || 0)}</td>
                  <td className="px-3.5 py-2.5 border-b border-border"><StatusBadge status={n.status} /></td>
                </tr>
              ))}
              {!recent.length && (
                <tr><td colSpan={5} className="text-center text-ast-text3 py-8">Nenhuma negociação</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
