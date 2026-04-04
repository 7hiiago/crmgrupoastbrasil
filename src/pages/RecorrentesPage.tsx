import React, { useState } from 'react';
import { DB, fmt, fmtDate, uid, nextRecCode } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { Recorrente, Empresa, Cliente, User, Anexo } from '@/lib/types';
import { PageHeader, TableCard, DataTable, Th, Td, EmptyRow, Badge, Btn } from '@/components/UIComponents';
import Modal, { FormSection, FormGrid, FormGroup, inputClass, selectClass, textareaClass } from '@/components/Modal';
import AnexoManager from '@/components/AnexoManager';
import { gerarPropostaPDF, enviarPropostaWhatsApp } from '@/lib/propostas';

export default function RecorrentesPage() {
  const { user, isAdmin } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Recorrente>>({});
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adminSenha, setAdminSenha] = useState('');
  const [adminSenhaErro, setAdminSenhaErro] = useState(false);
  // Modal de redistribuição de carteira
  const [redistModal, setRedistModal] = useState(false);
  const [redistVendedorOrigem, setRedistVendedorOrigem] = useState('');
  const [redistVendedorDestino, setRedistVendedorDestino] = useState('');
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const empresas = DB.get<Empresa>('empresas');
  const clientes = DB.get<Cliente>('clientes');
  const users    = DB.get<User>('users').filter(u => u.ativo !== false);
  const allUsers = DB.get<User>('users'); // inclui inativos para redistribuição

  // Filtro por vendedor: não-admin vê apenas as próprias recorrentes
  let recs = DB.get<Recorrente>('recorrentes');
  if (!isAdmin) {
    recs = recs.filter(r => r.responsavelId === user?.id);
  }

  const openNew = () => {
    setEditingId(null);
    setForm({
      codigo: nextRecCode(),
      data: new Date().toISOString().split('T')[0],
      status: 'ativo',
      responsavelId: user?.id,
    });
    setAnexos([]);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const rec = DB.get<Recorrente>('recorrentes').find(r => r.id === id);
    if (!rec) return;
    if (!isAdmin && rec.responsavelId !== user?.id) return;
    setEditingId(rec.id);
    setForm({ ...rec });
    setAnexos(rec.anexos || []);
    setModalOpen(true);
  };

  const save = () => {
    const cliId = form.clienteId;
    if (!cliId) return;
    const cli  = clientes.find(c => c.id === cliId);
    const resp = users.find(u => u.id === form.responsavelId);
    const rec: Recorrente = {
      id: editingId || uid(),
      codigo: form.codigo || '',
      data: form.data || '',
      clienteId: cliId,
      clienteNome: cli?.nome || '',
      produto: form.produto || '',
      valor: form.valor || 0,
      dia: form.dia || 1,
      empresa: form.empresa || 'all',
      responsavelId: form.responsavelId || '',
      responsavelNome: resp?.nome || '',
      status: (form.status as Recorrente['status']) || 'ativo',
      obs: form.obs || '',
      anexos,
      indicacaoNome: form.indicacaoNome || '',
      indicacaoId: form.indicacaoId || '',
    };
    const arr = DB.get<Recorrente>('recorrentes');
    const idx = arr.findIndex(r => r.id === rec.id);
    if (idx > -1) arr[idx] = rec; else arr.push(rec);
    DB.set('recorrentes', arr);
    setModalOpen(false);
    refresh();
  };

  // ── Exclusão com senha admin ───────────────────────────────────────────
  const askDelete = (id: string) => {
    setDeletingId(id);
    setAdminSenha('');
    setAdminSenhaErro(false);
    setDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    const admins = DB.get<User>('users').filter(u => u.perfil === 'admin' && u.ativo !== false);
    if (!admins.some(a => a.senha === adminSenha)) {
      setAdminSenhaErro(true);
      return;
    }
    DB.set('recorrentes', DB.get<Recorrente>('recorrentes').filter(r => r.id !== deletingId));
    setDeleteModal(false);
    setDeletingId(null);
    setAdminSenha('');
    refresh();
  };

  // ── Redistribuição de carteira ─────────────────────────────────────────
  const openRedist = () => {
    setRedistVendedorOrigem('');
    setRedistVendedorDestino('');
    setRedistModal(true);
  };

  const confirmRedist = () => {
    if (!redistVendedorOrigem || !redistVendedorDestino) return;
    if (redistVendedorOrigem === redistVendedorDestino) {
      alert('Origem e destino não podem ser o mesmo vendedor.');
      return;
    }
    const destUser = allUsers.find(u => u.id === redistVendedorDestino);
    const arr = DB.get<Recorrente>('recorrentes').map(r => {
      if (r.responsavelId === redistVendedorOrigem) {
        return {
          ...r,
          responsavelId: redistVendedorDestino,
          responsavelNome: destUser?.nome || '',
        };
      }
      return r;
    });
    DB.set('recorrentes', arr);
    setRedistModal(false);
    refresh();
  };

  // Contar carteira por vendedor (para exibir no modal de redistribuição)
  const carteiraPorVendedor = (vendedorId: string) =>
    DB.get<Recorrente>('recorrentes').filter(r => r.responsavelId === vendedorId && r.status === 'ativo').length;

  return (
    <div>
      <PageHeader title="RECOR" titleEm="RENTES" sub="Carteira de clientes e contratos ativos">
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Btn variant="secondary" onClick={openRedist}>
              🔄 Redistribuir carteira
            </Btn>
          )}
          <Btn onClick={openNew}>+ Nova Recorrente</Btn>
        </div>
      </PageHeader>

      <TableCard title={`${recs.length} recorrente${recs.length !== 1 ? 's' : ''}`}>
        <DataTable>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Cliente</Th>
              <Th>Produto/Serviço</Th>
              <Th>Valor mensal</Th>
              <Th>Empresa</Th>
              <Th>Data início</Th>
              <Th>Vendedor</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {recs.length ? recs.map(r => (
              <tr key={r.id} className="hover:bg-ast-bg3 cursor-pointer" onClick={() => openEdit(r.id)}>
                <Td><strong className="text-foreground font-semibold">{r.codigo}</strong></Td>
                <Td>{r.clienteNome || '—'}</Td>
                <Td>{r.produto || '—'}</Td>
                <Td>R$ {fmt(r.valor || 0)}</Td>
                <Td className="hidden sm:table-cell">
                  {r.empresa === 'all' ? 'Todas' : empresas.find(e => e.id === r.empresa)?.nome || '—'}
                </Td>
                <Td className="hidden md:table-cell">{fmtDate(r.data)}</Td>
                <Td>{r.responsavelNome || '—'}</Td>
                <Td>
                  <Badge variant={r.status === 'ativo' ? 'green' : r.status === 'pausado' ? 'amber' : 'gray'}>
                    {r.status === 'ativo' ? 'Ativo' : r.status === 'pausado' ? 'Pausado' : 'Cancelado'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Btn variant="icon" sm onClick={() => gerarPropostaPDF(r, 'recorrente')}>📄</Btn>
                    <Btn variant="icon" sm onClick={() => enviarPropostaWhatsApp(r)}>💬</Btn>
                    {(isAdmin || r.responsavelId === user?.id) && (
                      <Btn variant="icon" sm onClick={() => askDelete(r.id)} title="Excluir (requer confirmação)">
                        ×
                      </Btn>
                    )}
                  </div>
                </Td>
              </tr>
            )) : <EmptyRow cols={9} text="Nenhuma recorrente" />}
          </tbody>
        </DataTable>
      </TableCard>

      {/* ── MODAL RECORRENTE ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Recorrente' : 'Nova Recorrente'}
        wide
        footer={<>
          <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn>
          <Btn onClick={save}>Salvar</Btn>
        </>}
      >
        <FormSection title="Dados da recorrência">
          <FormGrid>
            <FormGroup label="Código (auto)">
              <input className={inputClass} value={form.codigo || ''} readOnly />
            </FormGroup>
            <FormGroup label="Data início">
              <input type="date" className={inputClass} value={form.data || ''} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Cliente *">
              <select className={selectClass} value={form.clienteId || ''} onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))}>
                <option value="">Selecionar…</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Produto/Serviço">
              <input className={inputClass} value={form.produto || ''} onChange={e => setForm(f => ({ ...f, produto: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Valor mensal (R$)">
              <input type="number" className={inputClass} value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} />
            </FormGroup>
            <FormGroup label="Dia vencimento">
              <input type="number" min={1} max={31} className={inputClass} value={form.dia || ''} onChange={e => setForm(f => ({ ...f, dia: parseInt(e.target.value) || 1 }))} />
            </FormGroup>
            <FormGroup label="Empresa AST">
              <select className={selectClass} value={form.empresa || 'all'} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}>
                <option value="all">Todas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Vendedor responsável">
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
              <select className={selectClass} value={form.status || 'ativo'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Recorrente['status'] }))}>
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </FormGroup>
            <FormGroup label="Observações" full>
              <textarea className={textareaClass} value={form.obs || ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
            </FormGroup>
          </FormGrid>
        </FormSection>
        <FormSection title="Anexos">
          <AnexoManager anexos={anexos} onChange={setAnexos} />
        </FormSection>
      </Modal>

      {/* ── MODAL REDISTRIBUIR CARTEIRA ── */}
      <Modal
        open={redistModal}
        onClose={() => setRedistModal(false)}
        title="Redistribuir carteira de clientes"
        footer={<>
          <Btn variant="secondary" onClick={() => setRedistModal(false)}>Cancelar</Btn>
          <Btn onClick={confirmRedist}>Transferir carteira</Btn>
        </>}
      >
        <div className="space-y-4">
          <p className="text-sm text-ast-text2">
            Transfere <strong className="text-foreground">todas</strong> as recorrentes ativas de um vendedor para outro. Use quando um vendedor for desligado.
          </p>
          <FormGrid>
            <FormGroup label="Vendedor de origem (quem sai)">
              <select
                className={selectClass}
                value={redistVendedorOrigem}
                onChange={e => setRedistVendedorOrigem(e.target.value)}
              >
                <option value="">Selecionar…</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nome}{u.ativo === false ? ' (inativo)' : ''} — {carteiraPorVendedor(u.id)} ativo(s)
                  </option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="Vendedor de destino (quem recebe)">
              <select
                className={selectClass}
                value={redistVendedorDestino}
                onChange={e => setRedistVendedorDestino(e.target.value)}
              >
                <option value="">Selecionar…</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </FormGroup>
          </FormGrid>
          {redistVendedorOrigem && redistVendedorDestino && redistVendedorOrigem !== redistVendedorDestino && (
            <div className="p-3 bg-ast-bg3 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-amber-400">
                ⚠️ Serão transferidos <strong>{carteiraPorVendedor(redistVendedorOrigem)}</strong> contrato(s) ativo(s) de{' '}
                <strong>{allUsers.find(u => u.id === redistVendedorOrigem)?.nome}</strong> para{' '}
                <strong>{users.find(u => u.id === redistVendedorDestino)?.nome}</strong>.
                Esta ação não pode ser desfeita.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ── MODAL CONFIRMAR EXCLUSÃO ── */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Confirmar exclusão"
        footer={<>
          <Btn variant="secondary" onClick={() => setDeleteModal(false)}>Cancelar</Btn>
          <Btn onClick={confirmDelete}>Confirmar exclusão</Btn>
        </>}
      >
        <div className="space-y-4">
          <p className="text-sm text-ast-text2">
            A exclusão requer confirmação de um <strong className="text-foreground">administrador</strong>.
          </p>
          <FormGroup label="Senha do administrador">
            <input
              type="password"
              className={inputClass}
              value={adminSenha}
              onChange={e => { setAdminSenha(e.target.value); setAdminSenhaErro(false); }}
              placeholder="Digite a senha…"
              onKeyDown={e => e.key === 'Enter' && confirmDelete()}
            />
          </FormGroup>
          {adminSenhaErro && (
            <p className="text-xs text-primary">Senha incorreta. Tente novamente.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
