import React, { useState } from 'react';
import { DB, fmt } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { Negociacao, User } from '@/lib/types';
import { PIPELINE_STAGES } from '@/lib/types';
import { PageHeader } from '@/components/UIComponents';

// Busca valor real da proposta salva
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

export default function PipelinePage({
  onNewNeg,
  onEditNeg,
}: {
  onNewNeg: () => void;
  onEditNeg: (id: string) => void;
}) {
  const { user, isAdmin } = useAuth();
  const [filterUid, setFilterUid] = useState(isAdmin ? 'all' : user?.id || 'all');

  const users = DB.get<User>('users').filter(u => u.ativo !== false);

  // Não-admin sempre vê apenas suas negociações
  const effectiveUid = isAdmin ? filterUid : (user?.id || 'all');

  let negs = DB.get<Negociacao>('negociacoes').filter(n => n.status !== 'perdida');
  if (effectiveUid !== 'all') {
    negs = negs.filter(n => n.responsavelId === effectiveUid);
  }

  const totalGeral = negs.reduce((sum, n) => sum + getValorProposta(n), 0);

  return (
    <div>
      <PageHeader title="PIPE" titleEm="LINE" sub="Visão kanban das negociações ativas">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filtro por vendedor — apenas admin vê */}
          {isAdmin && (
            <select
              value={filterUid}
              onChange={e => setFilterUid(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-foreground text-xs"
            >
              <option value="all">Todos os vendedores</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          )}
          <button
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded font-bold text-xs tracking-wider uppercase hover:bg-ast-red-dark transition-colors"
            onClick={onNewNeg}
          >
            + Nova Negociação
          </button>
        </div>
      </PageHeader>

      {/* Resumo total do pipeline visível */}
      {negs.length > 0 && (
        <div className="mb-4 flex items-center gap-4 flex-wrap">
          <div className="text-xs text-ast-text3">
            <span className="font-semibold text-foreground">{negs.length}</span> negociações ativas
          </div>
          <div className="text-xs text-ast-text3">
            Pipeline total: <span className="font-semibold text-primary">R$ {fmt(totalGeral)}</span>
          </div>
          {!isAdmin && (
            <div className="text-xs text-ast-text3 bg-ast-bg3 px-2 py-1 rounded">
              📌 Exibindo apenas suas negociações
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-start">
        {PIPELINE_STAGES.map(s => {
          const cards = negs.filter(n => n.status === s.key);
          const totalCol = cards.reduce((sum, n) => sum + getValorProposta(n), 0);
          return (
            <div key={s.key} className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Cabeçalho da coluna */}
              <div
                className="px-3.5 py-2.5 border-b border-border text-[10px] font-bold tracking-[1.5px] uppercase flex items-center justify-between"
                style={{ color: s.color }}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="text-ast-text3">{cards.length}</span>
              </div>

              {/* Cards */}
              <div className="p-2.5 flex flex-col gap-2 min-h-[80px]">
                {cards.length ? cards.map(n => (
                  <div
                    key={n.id}
                    className="bg-ast-bg3 border border-border rounded p-2.5 cursor-pointer hover:border-ast-border2 transition-colors"
                    onClick={() => onEditNeg(n.id)}
                  >
                    <div className="text-[9px] text-ast-text3 tracking-wider mb-0.5">{n.codigo}</div>
                    <div className="text-xs font-semibold text-foreground mb-1 leading-tight">{n.titulo}</div>
                    <div className="text-[13px] text-primary font-bold">R$ {fmt(getValorProposta(n))}</div>
                    <div className="text-[10px] text-ast-text3 mt-1">{n.clienteNome || '—'}</div>

                    {/* Admin vê o vendedor responsável em cada card */}
                    {isAdmin && n.responsavelNome && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className="text-[9px] bg-ast-bg4 border border-border rounded-full px-2 py-0.5 text-ast-text3">
                          👤 {n.responsavelNome}
                        </span>
                        {n.prob && (
                          <span className="text-[9px] text-ast-text3">
                            {n.prob === 75 ? '🔥' : n.prob === 25 ? '❄️' : '🌤'} {n.prob}%
                          </span>
                        )}
                      </div>
                    )}

                    {/* Não-admin vê apenas a temperatura */}
                    {!isAdmin && n.prob && (
                      <div className="text-[10px] text-ast-text3 mt-1">
                        {n.prob === 75 ? '🔥 Quente' : n.prob === 25 ? '❄️ Frio' : '🌤 Morno'}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="p-2 text-[11px] text-ast-text3">Sem itens</div>
                )}
              </div>

              {/* Total da coluna */}
              {totalCol > 0 && (
                <div className="px-3 py-1.5 border-t border-border text-[10px] text-ast-text3">
                  R$ {fmt(totalCol)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
