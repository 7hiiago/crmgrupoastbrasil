import React, { useState } from 'react';
import { DB, uid } from '@/lib/db';
import type { Parceiro, Empresa } from '@/lib/types';
import { PARTNER_TYPES } from '@/lib/types';
import { PageHeader, TableCard, DataTable, Th, Td, EmptyRow, Badge, Btn } from '@/components/UIComponents';
import Modal, { FormSection, FormGrid, FormGroup, inputClass, selectClass, textareaClass } from '@/components/Modal';

export default function ParceirosPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Parceiro>>({});
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const empresas = DB.get<Empresa>('empresas');
  const parceiros = DB.get<Parceiro>('parceiros');

  const openNew = () => { setEditingId(null); setForm({ tipo: PARTNER_TYPES[0], empresaAst: 'all' }); setModalOpen(true); };
  const openEdit = (id: string) => { const p = parceiros.find(p => p.id === id); if (p) { setEditingId(p.id); setForm({ ...p }); setModalOpen(true); } };

  const save = () => {
    if (!form.nome?.trim()) return;
    const par: Parceiro = { id: editingId || uid(), nome: form.nome || '', empresa: form.empresa || '', tel: form.tel || '', email: form.email || '', tipo: form.tipo || '', empresaAst: form.empresaAst || 'all', obs: form.obs || '' };
    const arr = DB.get<Parceiro>('parceiros');
    const idx = arr.findIndex(p => p.id === par.id);
    if (idx > -1) arr[idx] = par; else arr.push(par);
    DB.set('parceiros', arr);
    setModalOpen(false); refresh();
  };

  const deletePar = (id: string) => { if (!confirm('Excluir parceiro?')) return; DB.set('parceiros', DB.get<Parceiro>('parceiros').filter(p => p.id !== id)); refresh(); };

  return (
    <div>
      <PageHeader title="PARCE" titleEm="IROS" sub="Rede de parceiros"><Btn onClick={openNew}>+ Novo Parceiro</Btn></PageHeader>
      <TableCard>
        <DataTable>
          <thead><tr><Th>Nome</Th><Th>Empresa</Th><Th>Tipo</Th><Th>Contato</Th><Th>Empresa Assoc.</Th><Th>Ativo</Th><Th></Th></tr></thead>
          <tbody>
            {parceiros.length ? parceiros.map(p => (
              <tr key={p.id} className="hover:bg-ast-bg3 cursor-pointer" onClick={() => openEdit(p.id)}>
                <Td><strong className="text-foreground font-semibold">{p.nome}</strong></Td>
                <Td>{p.empresa || '—'}</Td>
                <Td><Badge variant="blue">{p.tipo || '—'}</Badge></Td>
                <Td>{p.tel || p.email || '—'}</Td>
                <Td>{p.empresaAst === 'all' ? 'Todas' : empresas.find(e => e.id === p.empresaAst)?.nome || '—'}</Td>
                <Td><Badge variant="green">Ativo</Badge></Td>
                <Td><div onClick={e => e.stopPropagation()}><Btn variant="icon" sm onClick={() => deletePar(p.id)}>×</Btn></div></Td>
              </tr>
            )) : <EmptyRow cols={7} text="Nenhum parceiro" />}
          </tbody>
        </DataTable>
      </TableCard>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Parceiro' : 'Novo Parceiro'}
        footer={<><Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn><Btn onClick={save}>Salvar parceiro</Btn></>}>
        <FormSection title="Dados do parceiro">
          <FormGrid>
            <FormGroup label="Nome *"><input className={inputClass} value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></FormGroup>
            <FormGroup label="Empresa"><input className={inputClass} value={form.empresa || ''} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} /></FormGroup>
            <FormGroup label="Tipo de parceiro">
              <select className={selectClass} value={form.tipo || PARTNER_TYPES[0]} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {PARTNER_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Telefone"><input className={inputClass} value={form.tel || ''} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} /></FormGroup>
            <FormGroup label="E-mail"><input className={inputClass} value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormGroup>
            <FormGroup label="Empresa(s) AST associada(s)">
              <select className={selectClass} value={form.empresaAst || 'all'} onChange={e => setForm(f => ({ ...f, empresaAst: e.target.value }))}>
                <option value="all">Todas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Observações" full><textarea className={textareaClass} value={form.obs || ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} /></FormGroup>
          </FormGrid>
        </FormSection>
      </Modal>
    </div>
  );
}
