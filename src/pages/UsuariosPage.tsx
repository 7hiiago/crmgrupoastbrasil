import React, { useState } from 'react';
import { DB, uid, fmt } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { User, Empresa } from '@/lib/types';
import { PageHeader, TableCard, DataTable, Th, Td, EmptyRow, Badge, Btn } from '@/components/UIComponents';
import Modal, { FormSection, FormGrid, FormGroup, inputClass, selectClass } from '@/components/Modal';

export default function UsuariosPage() {
  const { isAdmin } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<User & { senha: string }>>({});
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  if (!isAdmin) return <p className="text-ast-text3">Acesso restrito.</p>;

  const empresas = DB.get<Empresa>('empresas');
  const users = DB.get<User>('users');

  const openNew = () => { setEditingId(null); setForm({ perfil: 'comercial', metaReais: 0, comissao: 0, empresas: ['all'] }); setModalOpen(true); };
  const openEdit = (id: string) => { const u = users.find(u => u.id === id); if (u) { setEditingId(u.id); setForm({ ...u, senha: '' }); setModalOpen(true); } };

  const save = () => {
    if (!form.nome?.trim() || !form.email?.trim()) return;
    const existing = editingId ? users.find(u => u.id === editingId) : null;
    const usr: User = {
      id: editingId || uid(), nome: form.nome || '', email: form.email?.toLowerCase() || '',
      senha: form.senha || existing?.senha || 'ast2024',
      perfil: (form.perfil as User['perfil']) || 'comercial',
      metaReais: form.metaReais || 0, comissao: form.comissao || 0,
      ativo: true, empresas: form.empresas || ['all'],
      cargo: form.cargo || '', tel: form.tel || '',
    };
    const arr = DB.get<User>('users');
    const idx = arr.findIndex(u => u.id === usr.id);
    if (idx > -1) arr[idx] = usr; else arr.push(usr);
    DB.set('users', arr);
    setModalOpen(false); refresh();
  };

  const deleteUsr = (id: string) => {
    const arr = DB.get<User>('users');
    const idx = arr.findIndex(u => u.id === id);
    if (idx > -1) { arr[idx].ativo = false; DB.set('users', arr); }
    refresh();
  };

  const PERFIL_LABELS: Record<string, string> = { admin: 'Administrador', comercial: 'Comercial', prospectador: 'Prospectador', visualizador: 'Visualizador' };

  return (
    <div>
      <PageHeader title="USUÁ" titleEm="RIOS" sub="Gerenciamento de acesso"><Btn onClick={openNew}>+ Novo Usuário</Btn></PageHeader>
      <TableCard>
        <DataTable>
          <thead><tr><Th>Nome</Th><Th>E-mail</Th><Th>Perfil</Th><Th>Meta (R$)</Th><Th>Comissão (%)</Th><Th>Empresas</Th><Th>Ativo</Th><Th></Th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="hover:bg-ast-bg3 cursor-pointer" onClick={() => openEdit(u.id)}>
                <Td><strong className="text-foreground font-semibold">{u.nome}</strong></Td>
                <Td>{u.email}</Td>
                <Td>{PERFIL_LABELS[u.perfil] || u.perfil}</Td>
                <Td>R$ {fmt(u.metaReais || 0)}</Td>
                <Td>{u.comissao || 0}%</Td>
                <Td>{u.empresas?.includes('all') ? 'Todas' : u.empresas?.map(eid => empresas.find(e => e.id === eid)?.nome).filter(Boolean).join(', ') || '—'}</Td>
                <Td>{u.ativo !== false ? <Badge variant="green">Ativo</Badge> : <Badge variant="gray">Inativo</Badge>}</Td>
                <Td><div onClick={e => e.stopPropagation()}><Btn variant="icon" sm onClick={() => deleteUsr(u.id)}>×</Btn></div></Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </TableCard>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Usuário' : 'Novo Usuário'}
        footer={<><Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn><Btn onClick={save}>Salvar usuário</Btn></>}>
        <FormSection title="Dados de acesso">
          <FormGrid>
            <FormGroup label="Nome completo *"><input className={inputClass} value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></FormGroup>
            <FormGroup label="E-mail *"><input className={inputClass} value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormGroup>
            <FormGroup label="Senha"><input type="password" className={inputClass} value={form.senha || ''} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mín. 6 caracteres" /></FormGroup>
            <FormGroup label="Perfil de acesso">
              <select className={selectClass} value={form.perfil || 'comercial'} onChange={e => setForm(f => ({ ...f, perfil: e.target.value as User['perfil'] }))}>
                <option value="admin">Administrador</option><option value="comercial">Comercial</option>
                <option value="prospectador">Prospectador</option><option value="visualizador">Visualizador</option>
              </select>
            </FormGroup>
            <FormGroup label="Meta mensal (R$)"><input type="number" className={inputClass} value={form.metaReais || 0} onChange={e => setForm(f => ({ ...f, metaReais: parseFloat(e.target.value) || 0 }))} /></FormGroup>
            <FormGroup label="Comissão (%)"><input type="number" min={0} max={100} className={inputClass} value={form.comissao || 0} onChange={e => setForm(f => ({ ...f, comissao: parseFloat(e.target.value) || 0 }))} /></FormGroup>
            <FormGroup label="Empresa(s) vinculada(s)" full>
              <select className={selectClass} multiple style={{ height: 80 }} value={form.empresas || ['all']} onChange={e => setForm(f => ({ ...f, empresas: Array.from(e.target.selectedOptions, o => o.value) }))}>
                <option value="all">Todas as empresas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <span className="text-[9px] text-ast-text3">Segure Ctrl para selecionar múltiplas</span>
            </FormGroup>
            <FormGroup label="Telefone"><input className={inputClass} value={form.tel || ''} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} /></FormGroup>
            <FormGroup label="Cargo"><input className={inputClass} value={form.cargo || ''} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} /></FormGroup>
          </FormGrid>
        </FormSection>
      </Modal>
    </div>
  );
}
