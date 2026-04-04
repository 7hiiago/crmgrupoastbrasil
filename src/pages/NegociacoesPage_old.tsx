import React, { useState } from 'react';
import { DB, fmt, fmtDate, uid } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { Negociacao, Empresa, User, Cliente, Anexo, HistoricoEntry } from '@/lib/types';
import { PageHeader, Tabs, TableCard, DataTable, Th, Td, EmptyRow, StatusBadge, Btn } from '@/components/UIComponents';
import Modal, { FormSection, FormGrid, FormGroup, inputClass, selectClass, textareaClass } from '@/components/Modal';
import AnexoManager from '@/components/AnexoManager';
import { gerarPropostaPDF, enviarPropostaWhatsApp } from '@/lib/propostas';
import { nextNegCode } from '@/lib/db';

const TABS = [
  { key: 'todas', label: 'Todas' },
  { key: 'aberta', label: 'Em aberto' },
  { key: 'fechada', label: 'Fechadas' },
  { key: 'perdida', label: 'Perdidas' },
];

export default function NegociacoesPage() {
  const { user, isAdmin } = useAuth();
  const [filter, setFilter] = useState('todas');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyNeg, setHistoryNeg] = useState<Negociacao | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  // Form state
  const [form, setForm] = useState<Partial<Negociacao>>({});
  const [anexos, setAnexos] = useState<Anexo[]>([]);

  const empresas = DB.get<Empresa>('empresas');
  const clientes = DB.get<Cliente>('clientes');
  const users = DB.get<User>('users').filter(u => u.ativo !== false);

  let negs = DB.get<Negociacao>('negociacoes');
  if (filter === 'aberta') negs = negs.filter(n => !['fechada', 'perdida'].includes(n.status));
  else if (filter !== 'todas') negs = negs.filter(n => n.status === filter);
  if (search) {
    const lq = search.toLowerCase();
    negs = negs.filter(n => n.codigo?.toLowerCase().includes(lq) || n.clienteNome?.toLowerCase().includes(lq) || n.titulo?.toLowerCase().includes(lq));
  }
  negs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const openNew = () => {
    setEditingId(null);
    setForm({
      codigo: nextNegCode(),
      data: new Date().toISOString().split('T')[0],
      status: 'contato',
      prob: 50,
      responsavelId: user?.id,
    });
    setAnexos([]);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const neg = DB.get<Negociacao>('negociacoes').find(n => n.id === id);
    if (!neg) return;
    setEditingId(neg.id);
    setForm({ ...neg });
    setAnexos(neg.anexos || []);
    setModalOpen(true);
  };

  const save = () => {
    if (!form.titulo?.trim()) return;
    const cli = clientes.find(c => c.id === form.clienteId);
    const resp = users.find(u => u.id === form.responsavelId);
    const allNegs = DB.get<Negociacao>('negociacoes');
    const existing = editingId ? allNegs.find(n => n.id === editingId) : null;

    // Build history entry
    const histEntry: HistoricoEntry = {
      data: new Date().toISOString(),
      usuarioId: user?.id || '',
      usuarioNome: user?.nome || '',
      acao: editingId ? 'Alteração' : 'Criação',
      detalhes: editingId ? buildDiffDetails(existing, form) : 'Negociação criada',
    };

    const neg: Negociacao = {
      id: editingId || uid(),
      codigo: form.codigo || '',
      titulo: form.titulo || '',
      clienteId: form.clienteId || '',
      clienteNome: cli?.nome || form.clienteNome || '',
      clienteTel: cli?.tel || form.clienteTel || '',
      clienteEmail: cli?.email || form.clienteEmail || '',
      empresa: form.empresa || '',
      responsavelId: form.responsavelId || '',
      responsavelNome: resp?.nome || form.responsavelNome || '',
      valor: form.valor || 0,
      status: (form.status as Negociacao['status']) || 'contato',
      prob: form.prob || 50,
      data: form.data || '',
      obs: form.obs || '',
      anexos,
      historico: [...(existing?.historico || []), histEntry],
    };

    const idx = allNegs.findIndex(n => n.id === neg.id);
    if (idx > -1) allNegs[idx] = neg; else allNegs.push(neg);
    DB.set('negociacoes', allNegs);
    setModalOpen(false);
    refresh();
  };

  const deleteNeg = (id: string) => {
    if (!isAdmin) {
      alert('Apenas administradores podem excluir negociações.');
      return;
    }
    if (!confirm('Excluir esta negociação?')) return;
    DB.set('negociacoes', DB.get<Negociacao>('negociacoes').filter(n => n.id !== id));
    refresh();
  };

  const showHistory = (id: string) => {
    const neg = DB.get<Negociacao>('negociacoes').find(n => n.id === id);
    if (neg) { setHistoryNeg(neg); setHistoryOpen(true); }
  };

  const fillCliente = (clienteId: string) => {
    const cli = clientes.find(c => c.id === clienteId);
    if (cli) setForm(f => ({ ...f, clienteId, clienteTel: cli.tel, clienteEmail: cli.email }));
    else setForm(f => ({ ...f, clienteId }));
  };

  return (
    <div>
      <PageHeader title="NEGO" titleEm="CIAÇÕES" sub="Projetos em andamento e histórico">
        <Btn onClick={openNew}>+ Nova Negociação</Btn>
      </PageHeader>

      <Tabs tabs={TABS} active={filter} onChange={setFilter} />

      <TableCard
        title={`${negs.length} negociação${negs.length !== 1 ? 's' : ''}`}
        headerRight={
          <input
            type="text"
            placeholder="Filtrar…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-ast-bg3 border border-border rounded px-2.5 py-1.5 text-foreground text-xs w-40"
          />
        }
      >
        <DataTable>
          <thead>
            <tr><Th>Código</Th><Th>Cliente</Th><Th>Empresa</Th><Th>Valor</Th><Th>Status</Th><Th>Responsável</Th><Th>Data</Th><Th></Th></tr>
          </thead>
          <tbody>
            {negs.length ? negs.map(n => (
              <tr key={n.id} className="hover:bg-ast-bg3 cursor-pointer" onClick={() => openEdit(n.id)}>
                <Td><strong className="text-foreground font-semibold">{n.codigo}</strong></Td>
                <Td>{n.clienteNome || '—'}</Td>
                <Td>{empresas.find(e => e.id === n.empresa)?.nome || '—'}</Td>
                <Td><strong className="text-primary font-semibold">R$ {fmt(n.valor || 0)}</strong></Td>
                <Td><StatusBadge status={n.status} /></Td>
                <Td>{n.responsavelNome || '—'}</Td>
                <Td>{fmtDate(n.data)}</Td>
                <Td>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Btn variant="icon" sm onClick={() => gerarPropostaPDF(n)}>📄</Btn>
                    <Btn variant="icon" sm onClick={() => enviarPropostaWhatsApp(n)}>💬</Btn>
                    <Btn variant="icon" sm onClick={() => showHistory(n.id)}>📋</Btn>
                    {isAdmin && <Btn variant="icon" sm onClick={() => deleteNeg(n.id)}>×</Btn>}
                  </div>
                </Td>
              </tr>
            )) : <EmptyRow cols={8} text="Nenhuma negociação encontrada" />}
          </tbody>
        </DataTable>
      </TableCard>

      {/* MODAL NEGOCIAÇÃO */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Negociação' : 'Nova Negociação'} wide
        footer={<>
          <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn>
          <Btn onClick={save}>Salvar negociação</Btn>
        </>}
      >
        <FormSection title="Identificação">
          <FormGrid cols={3}>
            <FormGroup label="Código (auto)"><input className={inputClass} value={form.codigo || ''} readOnly /></FormGroup>
            <FormGroup label="Data"><input type="date" className={inputClass} value={form.data || ''} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></FormGroup>
            <FormGroup label="Empresa associada">
              <select className={selectClass} value={form.empresa || ''} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}>
                <option value="">Selecionar…</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </FormGroup>
          </FormGrid>
        </FormSection>

        <FormSection title="Cliente">
          <FormGrid>
            <FormGroup label="Cliente">
              <select className={selectClass} value={form.clienteId || ''} onChange={e => fillCliente(e.target.value)}>
                <option value="">Selecionar…</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Responsável">
              <select className={selectClass} value={form.responsavelId || ''} onChange={e => setForm(f => ({ ...f, responsavelId: e.target.value }))}>
                <option value="">Selecionar…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Telefone"><input className={inputClass} value={form.clienteTel || ''} onChange={e => setForm(f => ({ ...f, clienteTel: e.target.value }))} /></FormGroup>
            <FormGroup label="E-mail"><input className={inputClass} value={form.clienteEmail || ''} onChange={e => setForm(f => ({ ...f, clienteEmail: e.target.value }))} /></FormGroup>
          </FormGrid>
        </FormSection>

        <FormSection title="Negociação">
          <FormGrid>
            <FormGroup label="Título / Descrição"><input className={inputClass} value={form.titulo || ''} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Automação residencial — 3 ambientes" /></FormGroup>
            <FormGroup label="Status">
              <select className={selectClass} value={form.status || 'contato'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Negociacao['status'] }))}>
                <option value="contato">Contato inicial</option>
                <option value="levantamento">Levantamento</option>
                <option value="proposta">Proposta enviada</option>
                <option value="negociacao">Em negociação</option>
                <option value="fechada">Fechada ✓</option>
                <option value="perdida">Perdida</option>
              </select>
            </FormGroup>
            <FormGroup label="Valor estimado (R$)"><input type="number" className={inputClass} value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} /></FormGroup>
            <FormGroup label="Probabilidade (%)"><input type="number" min={0} max={100} className={inputClass} value={form.prob || ''} onChange={e => setForm(f => ({ ...f, prob: parseInt(e.target.value) || 0 }))} /></FormGroup>
            <FormGroup label="Observações" full><textarea className={textareaClass} value={form.obs || ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} /></FormGroup>
          </FormGrid>
        </FormSection>

        <FormSection title="Anexos">
          <AnexoManager anexos={anexos} onChange={setAnexos} />
        </FormSection>
      </Modal>

      {/* MODAL HISTÓRICO */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={`Histórico — ${historyNeg?.codigo || ''}`}>
        {historyNeg?.historico?.length ? (
          <div className="space-y-3">
            {historyNeg.historico.map((h, i) => (
              <div key={i} className="bg-ast-bg3 border border-border rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground">{h.acao}</span>
                  <span className="text-[10px] text-ast-text3">{new Date(h.data).toLocaleString('pt-BR')}</span>
                </div>
                <div className="text-[11px] text-ast-text2">{h.usuarioNome}</div>
                <div className="text-[11px] text-ast-text3 mt-1">{h.detalhes}</div>
              </div>
            ))}
          </div>
        ) : <p className="text-ast-text3 text-sm">Nenhum histórico registrado.</p>}
      </Modal>
    </div>
  );
}

function buildDiffDetails(old: Negociacao | null | undefined, newForm: Partial<Negociacao>): string {
  if (!old) return 'Negociação criada';
  const changes: string[] = [];
  if (old.titulo !== newForm.titulo) changes.push(`Título: "${old.titulo}" → "${newForm.titulo}"`);
  if (old.status !== newForm.status) changes.push(`Status: ${old.status} → ${newForm.status}`);
  if (old.valor !== newForm.valor) changes.push(`Valor: R$ ${fmt(old.valor)} → R$ ${fmt(newForm.valor || 0)}`);
  if (old.prob !== newForm.prob) changes.push(`Probabilidade: ${old.prob}% → ${newForm.prob}%`);
  if (old.obs !== newForm.obs) changes.push('Observações alteradas');
  return changes.length ? changes.join('; ') : 'Dados atualizados';
}
