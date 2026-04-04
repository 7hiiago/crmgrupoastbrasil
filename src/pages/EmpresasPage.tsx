import React, { useState } from 'react';
import { DB, uid } from '@/lib/db';
import type { Empresa } from '@/lib/types';
import { PageHeader, TableCard, DataTable, Th, Td, EmptyRow, Badge, Btn } from '@/components/UIComponents';
import Modal, { FormSection, FormGrid, FormGroup, inputClass } from '@/components/Modal';

export default function EmpresasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Empresa>>({});
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const empresas = DB.get<Empresa>('empresas');

  const openNew = () => { setEditingId(null); setForm({}); setModalOpen(true); };
  const openEdit = (id: string) => { const e = empresas.find(e => e.id === id); if (e) { setEditingId(e.id); setForm({ ...e }); setModalOpen(true); } };

  const save = () => {
    if (!form.nome?.trim()) return;
    const emp: Empresa = { id: editingId || uid(), nome: form.nome || '', cnpj: form.cnpj || '', tel: form.tel || '', email: form.email || '', resp: form.resp || '', end: form.end || '', ativa: true };
    const arr = DB.get<Empresa>('empresas');
    const idx = arr.findIndex(e => e.id === emp.id);
    if (idx > -1) arr[idx] = emp; else arr.push(emp);
    DB.set('empresas', arr);
    setModalOpen(false); refresh();
  };

  const deleteEmp = (id: string) => { if (!confirm('Excluir empresa?')) return; DB.set('empresas', DB.get<Empresa>('empresas').filter(e => e.id !== id)); refresh(); };

  return (
    <div>
      <PageHeader title="EMPRE" titleEm="SAS" sub="Empresas do grupo"><Btn onClick={openNew}>+ Nova Empresa</Btn></PageHeader>
      <TableCard>
        <DataTable>
          <thead><tr><Th>Nome</Th><Th>CNPJ</Th><Th>Responsável</Th><Th>Telefone</Th><Th>Ativa</Th><Th></Th></tr></thead>
          <tbody>
            {empresas.length ? empresas.map(e => (
              <tr key={e.id} className="hover:bg-ast-bg3 cursor-pointer" onClick={() => openEdit(e.id)}>
                <Td><strong className="text-foreground font-semibold">{e.nome}</strong></Td>
                <Td>{e.cnpj || '—'}</Td><Td>{e.resp || '—'}</Td><Td>{e.tel || '—'}</Td>
                <Td>{e.ativa !== false ? <Badge variant="green">Ativa</Badge> : <Badge variant="gray">Inativa</Badge>}</Td>
                <Td><div onClick={ev => ev.stopPropagation()}><Btn variant="icon" sm onClick={() => deleteEmp(e.id)}>×</Btn></div></Td>
              </tr>
            )) : <EmptyRow cols={6} text="Nenhuma empresa" />}
          </tbody>
        </DataTable>
      </TableCard>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Empresa' : 'Nova Empresa'}
        footer={<><Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn><Btn onClick={save}>Salvar empresa</Btn></>}>
        <FormSection title="Dados da empresa">
          <FormGrid>
            <FormGroup label="Nome *"><input className={inputClass} value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></FormGroup>
            <FormGroup label="CNPJ"><input className={inputClass} value={form.cnpj || ''} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} /></FormGroup>
            <FormGroup label="Telefone"><input className={inputClass} value={form.tel || ''} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} /></FormGroup>
            <FormGroup label="E-mail"><input className={inputClass} value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormGroup>
            <FormGroup label="Responsável"><input className={inputClass} value={form.resp || ''} onChange={e => setForm(f => ({ ...f, resp: e.target.value }))} /></FormGroup>
            <FormGroup label="Endereço" full><input className={inputClass} value={form.end || ''} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} /></FormGroup>
          </FormGrid>
        </FormSection>
      </Modal>
    </div>
  );
}
