import React, { useState, useEffect } from 'react';
import { DB, uid, fmtDate } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { Negociacao, Cliente, User } from '@/lib/types';
import { PageHeader, Tabs, Btn } from '@/components/UIComponents';
import Modal, { FormSection, FormGrid, FormGroup, inputClass, selectClass, textareaClass } from '@/components/Modal';

// ─── Tarefa type ─────────────────────────────────────────────────────────────
export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: 'ligacao' | 'email' | 'reuniao' | 'proposta' | 'followup' | 'outro';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'pendente' | 'concluida' | 'cancelada';
  negociacaoId?: string;
  negociacaoTitulo?: string;
  clienteId?: string;
  clienteNome?: string;
  responsavelId: string;
  responsavelNome: string;
  dataVencimento: string;
  dataConclusao?: string;
  criadoEm: string;
  criadoPor: string;
  lembrete?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TIPO_ICONS: Record<string, string> = {
  ligacao: '📞', email: '✉️', reuniao: '📅', proposta: '📄', followup: '🔁', outro: '📌',
};
const TIPO_LABELS: Record<string, string> = {
  ligacao: 'Ligação', email: 'E-mail', reuniao: 'Reunião', proposta: 'Proposta', followup: 'Follow-up', outro: 'Outro',
};
const PRIO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  baixa:   { label: 'Baixa',   color: '#3B6D11', bg: '#EAF3DE' },
  media:   { label: 'Média',   color: '#185FA5', bg: '#E6F1FB' },
  alta:    { label: 'Alta',    color: '#854F0B', bg: '#FAEEDA' },
  urgente: { label: 'Urgente', color: '#A32D2D', bg: '#FCEBEB' },
};

function PrioBadge({ p }: { p: string }) {
  const c = PRIO_CONFIG[p] || PRIO_CONFIG.media;
  return (
    <span style={{ background: c.bg, color: c.color }}
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold">
      {c.label}
    </span>
  );
}

function isOverdue(t: Tarefa) {
  return t.status === 'pendente' && t.dataVencimento < new Date().toISOString().split('T')[0];
}
function isDueToday(t: Tarefa) {
  return t.status === 'pendente' && t.dataVencimento === new Date().toISOString().split('T')[0];
}

const TABS_DEF = [
  { key: 'pendentes',  label: 'Pendentes' },
  { key: 'hoje',       label: 'Hoje' },
  { key: 'atrasadas',  label: 'Atrasadas' },
  { key: 'concluidas', label: 'Concluídas' },
  { key: 'todas',      label: 'Todas' },
];

// ─── NotificationBell ─────────────────────────────────────────────────────────
export function NotificationBell({ onClick }: { onClick: () => void }) {
  // Sino mostra apenas tarefas do usuário logado — buscamos via contexto
  // Como é exportado e usado fora do componente, usamos useAuth diretamente
  const { user, isAdmin } = useAuth();
  const todasTarefas = DB.get<Tarefa>('tarefas');
  const minhas = isAdmin
    ? todasTarefas
    : todasTarefas.filter(t => t.responsavelId === user?.id);
  const urgentes = minhas.filter(t => t.status === 'pendente' && (isOverdue(t) || isDueToday(t)));
  if (!urgentes.length) return null;
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
      title={`${urgentes.length} tarefa(s) urgente(s)`}
    >
      <span className="text-sm">🔔</span>
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
        {urgentes.length > 9 ? '9+' : urgentes.length}
      </span>
    </button>
  );
}

// ─── NotificationPanel ────────────────────────────────────────────────────────
export function NotificationPanel({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user, isAdmin } = useAuth();
  const todasTarefas = DB.get<Tarefa>('tarefas');
  const minhas = isAdmin
    ? todasTarefas
    : todasTarefas.filter(t => t.responsavelId === user?.id);
  const urgentes = minhas
    .filter(t => t.status === 'pendente' && (isOverdue(t) || isDueToday(t)))
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
    .slice(0, 6);

  if (!urgentes.length) return null;

  return (
    <div className="absolute right-0 top-10 z-50 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Alertas</span>
        <button className="text-[11px] text-primary hover:underline" onClick={() => onNavigate('tarefas')}>
          Ver todas
        </button>
      </div>
      <div className="divide-y divide-border">
        {urgentes.map(t => (
          <div key={t.id} className="px-4 py-2.5 hover:bg-ast-bg3 cursor-pointer" onClick={() => onNavigate('tarefas')}>
            <div className="flex items-center gap-2 mb-0.5">
              <span style={{ fontSize: 13 }}>{TIPO_ICONS[t.tipo]}</span>
              <span className="text-[12px] font-semibold text-foreground truncate flex-1">{t.titulo}</span>
              <PrioBadge p={t.prioridade} />
            </div>
            <div className="text-[10px] text-ast-text3 ml-5">
              {isOverdue(t)
                ? <span className="text-primary font-semibold">⚠ Atrasada — {fmtDate(t.dataVencimento)}</span>
                : <span className="text-ast-amber font-semibold">📅 Vence hoje</span>}
              {t.clienteNome && <span className="ml-2">· {t.clienteNome}</span>}
              {/* Admin vê de qual vendedor é a tarefa */}
              {isAdmin && <span className="ml-2 text-ast-text3">· {t.responsavelNome}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TarefasPage ──────────────────────────────────────────────────────────────
export default function TarefasPage() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState('pendentes');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Tarefa>>({});
  // Filtro de vendedor — só admin usa
  const [filterUid, setFilterUid] = useState('all');
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const allNegs  = DB.get<Negociacao>('negociacoes');
  const clientes = DB.get<Cliente>('clientes');
  const users    = DB.get<User>('users').filter(u => u.ativo !== false);

  // ── Negociações visíveis: não-admin vê apenas as suas ────────────────
  const negsVisiveis = isAdmin
    ? allNegs
    : allNegs.filter(n => n.responsavelId === user?.id);

  // Browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Notificação do browser ao abrir — apenas tarefas do próprio usuário
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const tarefas = DB.get<Tarefa>('tarefas').filter(t =>
      t.responsavelId === user?.id &&
      t.status === 'pendente' &&
      (isOverdue(t) || isDueToday(t))
    );
    if (tarefas.length > 0) {
      new Notification(`📋 ${tarefas.length} tarefa(s) pendente(s)`, {
        body: tarefas.slice(0, 3).map(t => `• ${t.titulo}`).join('\n'),
        icon: '/favicon.ico',
      });
    }
  }, []);

  // ── Tarefas filtradas por usuário ─────────────────────────────────────
  let tarefas = DB.get<Tarefa>('tarefas');

  // Não-admin: só vê as suas
  if (!isAdmin) {
    tarefas = tarefas.filter(t => t.responsavelId === user?.id);
  } else if (filterUid !== 'all') {
    // Admin com filtro específico
    tarefas = tarefas.filter(t => t.responsavelId === filterUid);
  }

  // Filtro por aba
  if (tab === 'pendentes')  tarefas = tarefas.filter(t => t.status === 'pendente');
  if (tab === 'hoje')       tarefas = tarefas.filter(t => isDueToday(t));
  if (tab === 'atrasadas')  tarefas = tarefas.filter(t => isOverdue(t));
  if (tab === 'concluidas') tarefas = tarefas.filter(t => t.status === 'concluida');

  // Ordenar: atrasadas primeiro, depois por data
  tarefas = [...tarefas].sort((a, b) => {
    if (isOverdue(a) && !isOverdue(b)) return -1;
    if (!isOverdue(a) && isOverdue(b)) return 1;
    return a.dataVencimento.localeCompare(b.dataVencimento);
  });

  // ── Contadores para badges das abas (apenas do usuário efetivo) ───────
  const todasParaContar = isAdmin && filterUid === 'all'
    ? DB.get<Tarefa>('tarefas')
    : DB.get<Tarefa>('tarefas').filter(t =>
        isAdmin ? t.responsavelId === filterUid : t.responsavelId === user?.id
      );
  const cntHoje  = todasParaContar.filter(t => isDueToday(t)).length;
  const cntAtras = todasParaContar.filter(t => isOverdue(t)).length;

  const tabsWithCount = TABS_DEF.map(t => ({
    ...t,
    label: t.key === 'hoje' && cntHoje > 0
      ? `Hoje (${cntHoje})`
      : t.key === 'atrasadas' && cntAtras > 0
        ? `Atrasadas (${cntAtras})`
        : t.label,
  }));

  // ── Abrir modal nova tarefa ───────────────────────────────────────────
  const openNew = (negId?: string) => {
    const neg = negId ? negsVisiveis.find(n => n.id === negId) : undefined;
    setEditingId(null);
    setForm({
      tipo: 'followup',
      prioridade: 'media',
      status: 'pendente',
      dataVencimento: new Date().toISOString().split('T')[0],
      // responsável padrão: usuário logado (admin pode mudar)
      responsavelId: user?.id,
      negociacaoId: neg?.id,
      negociacaoTitulo: neg?.titulo,
      clienteId: neg?.clienteId,
      clienteNome: neg?.clienteNome,
    });
    setModalOpen(true);
  };

  const openEdit = (t: Tarefa) => {
    // Não-admin só pode editar as suas
    if (!isAdmin && t.responsavelId !== user?.id) return;
    setEditingId(t.id);
    setForm({ ...t });
    setModalOpen(true);
  };

  // ── Salvar tarefa ─────────────────────────────────────────────────────
  const save = () => {
    if (!form.titulo?.trim() || !form.dataVencimento) return;
    const resp = users.find(u => u.id === form.responsavelId);
    const neg  = form.negociacaoId ? allNegs.find(n => n.id === form.negociacaoId) : undefined;
    const cli  = form.clienteId ? clientes.find(c => c.id === form.clienteId) : undefined;

    const t: Tarefa = {
      id: editingId || uid(),
      titulo: form.titulo || '',
      descricao: form.descricao || '',
      tipo: (form.tipo as Tarefa['tipo']) || 'followup',
      prioridade: (form.prioridade as Tarefa['prioridade']) || 'media',
      status: (form.status as Tarefa['status']) || 'pendente',
      negociacaoId: form.negociacaoId || '',
      negociacaoTitulo: neg?.titulo || form.negociacaoTitulo || '',
      clienteId: form.clienteId || neg?.clienteId || '',
      clienteNome: cli?.nome || neg?.clienteNome || form.clienteNome || '',
      responsavelId: form.responsavelId || user?.id || '',
      responsavelNome: resp?.nome || user?.nome || '',
      dataVencimento: form.dataVencimento || '',
      criadoEm: editingId ? (form.criadoEm || new Date().toISOString()) : new Date().toISOString(),
      criadoPor: editingId ? (form.criadoPor || user?.nome || '') : (user?.nome || ''),
      lembrete: form.lembrete ?? true,
    };

    const arr = DB.get<Tarefa>('tarefas');
    const idx = arr.findIndex(x => x.id === t.id);
    if (idx > -1) arr[idx] = t; else arr.push(t);
    DB.set('tarefas', arr);
    setModalOpen(false);
    refresh();
  };

  // ── Concluir / excluir ────────────────────────────────────────────────
  const concluir = (id: string) => {
    const arr = DB.get<Tarefa>('tarefas');
    const idx = arr.findIndex(t => t.id === id);
    if (idx < 0) return;
    arr[idx].status = 'concluida';
    arr[idx].dataConclusao = new Date().toISOString().split('T')[0];
    DB.set('tarefas', arr);
    refresh();
  };

  const deleteTarefa = (id: string) => {
    if (!confirm('Excluir tarefa?')) return;
    DB.set('tarefas', DB.get<Tarefa>('tarefas').filter(t => t.id !== id));
    refresh();
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="TARE" titleEm="FAS" sub="Follow-up e atividades comerciais">
        <div className="flex items-center gap-3 flex-wrap">
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
          <Btn onClick={() => openNew()}>+ Nova Tarefa</Btn>
        </div>
      </PageHeader>

      {/* Banner de atraso */}
      {cntAtras > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3">
          <span className="text-lg">⚠️</span>
          <div>
            <div className="text-[12px] font-semibold text-primary">
              {cntAtras} tarefa{cntAtras > 1 ? 's' : ''} em atraso
              {isAdmin && filterUid === 'all' && ' (todos os vendedores)'}
            </div>
            <div className="text-[11px] text-ast-text2">
              Clique em "Atrasadas" para visualizar e resolver.
            </div>
          </div>
        </div>
      )}

      <Tabs tabs={tabsWithCount} active={tab} onChange={setTab} />

      {/* Lista de tarefas */}
      <div className="space-y-2 mt-1">
        {tarefas.length === 0 && (
          <div className="bg-card border border-border rounded-xl px-6 py-12 text-center">
            <div className="text-3xl mb-3">✅</div>
            <div className="text-[13px] font-semibold text-foreground mb-1">Tudo em dia!</div>
            <div className="text-[12px] text-ast-text3">Nenhuma tarefa nesta categoria.</div>
          </div>
        )}

        {tarefas.map(t => {
          const overdue = isOverdue(t);
          const today   = isDueToday(t);
          const isOwner = t.responsavelId === user?.id;
          return (
            <div
              key={t.id}
              className={`bg-card border rounded-xl px-4 py-3.5 flex items-start gap-3 transition-colors
                ${overdue ? 'border-primary/40 bg-primary/5' : today ? 'border-ast-amber/40' : 'border-border'}
              `}
            >
              {/* Checkbox */}
              <button
                onClick={() => (isAdmin || isOwner) && t.status === 'pendente' && concluir(t.id)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                  ${t.status === 'concluida'
                    ? 'bg-ast-green border-ast-green'
                    : overdue
                      ? 'border-primary hover:bg-primary/20'
                      : 'border-border hover:border-ast-green hover:bg-ast-green/10'
                  }`}
                title="Marcar como concluída"
                disabled={!isAdmin && !isOwner}
              >
                {t.status === 'concluida' && <span className="text-white text-[10px]">✓</span>}
              </button>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span style={{ fontSize: 13 }}>{TIPO_ICONS[t.tipo]}</span>
                  <span className={`text-[13px] font-semibold ${t.status === 'concluida' ? 'line-through text-ast-text3' : 'text-foreground'}`}>
                    {t.titulo}
                  </span>
                  <PrioBadge p={t.prioridade} />
                  {overdue && (
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Atrasada
                    </span>
                  )}
                  {today && !overdue && (
                    <span className="text-[10px] font-semibold text-ast-amber bg-ast-amber/10 px-2 py-0.5 rounded-full">
                      Hoje
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-ast-text3">
                  <span>📅 {fmtDate(t.dataVencimento)}</span>
                  {t.clienteNome && <span>👤 {t.clienteNome}</span>}
                  {t.negociacaoTitulo && <span>💼 {t.negociacaoTitulo}</span>}
                  {/* Admin vê o vendedor responsável */}
                  {isAdmin && (
                    <span className="text-ast-text3">👥 {t.responsavelNome}</span>
                  )}
                  {t.status === 'concluida' && t.dataConclusao && (
                    <span className="text-ast-green">✓ Concluída em {fmtDate(t.dataConclusao)}</span>
                  )}
                </div>

                {t.descricao && (
                  <div className="mt-1.5 text-[11px] text-ast-text2 bg-ast-bg3 rounded-lg px-3 py-1.5">
                    {t.descricao}
                  </div>
                )}
              </div>

              {/* Ações: admin pode editar qualquer uma; não-admin só as suas */}
              {(isAdmin || isOwner) && (
                <div className="flex gap-1 flex-shrink-0">
                  <Btn variant="icon" sm onClick={() => openEdit(t)}>✏</Btn>
                  <Btn variant="icon" sm onClick={() => deleteTarefa(t.id)}>×</Btn>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── MODAL TAREFA ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Tarefa' : 'Nova Tarefa'}
        footer={<>
          <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn>
          <Btn onClick={save}>Salvar tarefa</Btn>
        </>}
      >
        <FormSection title="Atividade">
          <FormGrid>
            <FormGroup label="Título *" full>
              <input
                className={inputClass}
                value={form.titulo || ''}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Ligar para cliente sobre proposta"
              />
            </FormGroup>

            <FormGroup label="Tipo de atividade">
              <select className={selectClass} value={form.tipo || 'followup'} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as Tarefa['tipo'] }))}>
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{TIPO_ICONS[k]} {v}</option>
                ))}
              </select>
            </FormGroup>

            <FormGroup label="Prioridade">
              <select className={selectClass} value={form.prioridade || 'media'} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as Tarefa['prioridade'] }))}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </FormGroup>

            <FormGroup label="Data de vencimento">
              <input
                type="date"
                className={inputClass}
                value={form.dataVencimento || ''}
                onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))}
              />
            </FormGroup>

            {/* Responsável: admin pode atribuir a qualquer vendedor; não-admin só vê a si mesmo */}
            <FormGroup label="Responsável">
              <select
                className={selectClass}
                value={form.responsavelId || ''}
                onChange={e => setForm(f => ({ ...f, responsavelId: e.target.value }))}
                disabled={!isAdmin}
              >
                <option value="">Selecionar…</option>
                {(isAdmin ? users : users.filter(u => u.id === user?.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </FormGroup>

            <FormGroup label="Status">
              <select className={selectClass} value={form.status || 'pendente'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Tarefa['status'] }))}>
                <option value="pendente">Pendente</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </FormGroup>
          </FormGrid>
        </FormSection>

        <FormSection title="Vínculo (opcional)">
          <FormGrid>
            <FormGroup label="Negociação">
              <select
                className={selectClass}
                value={form.negociacaoId || ''}
                onChange={e => {
                  // Vincula à negociação selecionada — admin vê todas, não-admin só as suas
                  const neg = negsVisiveis.find(n => n.id === e.target.value);
                  setForm(f => ({
                    ...f,
                    negociacaoId: e.target.value,
                    negociacaoTitulo: neg?.titulo || '',
                    clienteId: neg?.clienteId || f.clienteId,
                    clienteNome: neg?.clienteNome || f.clienteNome,
                    // ao vincular negociação, pré-preenche responsável com o dono da neg (admin pode mudar)
                    responsavelId: neg?.responsavelId || f.responsavelId,
                  }));
                }}
              >
                <option value="">Nenhuma</option>
                {negsVisiveis
                  .filter(n => !['fechada', 'perdida'].includes(n.status))
                  .map(n => (
                    <option key={n.id} value={n.id}>
                      {n.codigo} — {n.titulo}
                      {isAdmin ? ` (${n.responsavelNome})` : ''}
                    </option>
                  ))}
              </select>
            </FormGroup>

            <FormGroup label="Cliente">
              <select
                className={selectClass}
                value={form.clienteId || ''}
                onChange={e => {
                  const cli = clientes.find(c => c.id === e.target.value);
                  setForm(f => ({ ...f, clienteId: e.target.value, clienteNome: cli?.nome || '' }));
                }}
              >
                <option value="">Nenhum</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </FormGroup>

            <FormGroup label="Descrição / Observação" full>
              <textarea
                className={textareaClass}
                value={form.descricao || ''}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Detalhes sobre o que fazer nessa atividade…"
              />
            </FormGroup>
          </FormGrid>
        </FormSection>
      </Modal>
    </div>
  );
}
