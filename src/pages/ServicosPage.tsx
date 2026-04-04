import React, { useState } from 'react';
import { DB, uid, fmt } from '@/lib/db';
import type { Servico, Empresa } from '@/lib/types';
import { PageHeader, TableCard, DataTable, Th, Td, EmptyRow, Badge, Btn } from '@/components/UIComponents';
import Modal, { FormSection, FormGrid, FormGroup, inputClass, selectClass, textareaClass } from '@/components/Modal';

export default function ServicosPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Servico>>({});
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const empresas = DB.get<Empresa>('empresas');
  const servicos = DB.get<Servico>('servicos');

  const openNew = () => { setEditingId(null); setForm({ tipo: 'Instalação', empresa: 'all', ativo: true }); setModalOpen(true); };
  const openEdit = (id: string) => { const s = servicos.find(s => s.id === id); if (s) { setEditingId(s.id); setForm({ ...s }); setModalOpen(true); } };

  const save = () => {
    if (!form.nome?.trim()) return;
    const serv: Servico = { id: editingId || uid(), nome: form.nome || '', tipo: form.tipo || '', valor: form.valor || 0, empresa: form.empresa || 'all', desc: form.desc || '', ativo: true };
    const arr = DB.get<Servico>('servicos');
    const idx = arr.findIndex(s => s.id === serv.id);
    if (idx > -1) arr[idx] = serv; else arr.push(serv);
    DB.set('servicos', arr);
    setModalOpen(false); refresh();
  };

  const deleteServ = (id: string) => { if (!confirm('Excluir serviço?')) return; DB.set('servicos', DB.get<Servico>('servicos').filter(s => s.id !== id)); refresh(); };

  return (
    <div>
      <PageHeader title="SERVI" titleEm="ÇOS" sub="Catálogo de serviços"><Btn onClick={openNew}>+ Novo Serviço</Btn></PageHeader>
      <TableCard>
        <DataTable>
          <thead><tr><Th>Nome</Th><Th>Tipo</Th><Th>Valor base</Th><Th>Empresa Assoc.</Th><Th>Ativo</Th><Th></Th></tr></thead>
          <tbody>
            {servicos.length ? servicos.map(s => (
              <tr key={s.id} className="hover:bg-ast-bg3 cursor-pointer" onClick={() => openEdit(s.id)}>
                <Td><strong className="text-foreground font-semibold">{s.nome}</strong></Td>
                <Td>{s.tipo || '—'}</Td>
                <Td>R$ {fmt(s.valor || 0)}</Td>
                <Td>{s.empresa === 'all' ? 'Todas' : empresas.find(e => e.id === s.empresa)?.nome || '—'}</Td>
                <Td>{s.ativo !== false ? <Badge variant="green">Ativo</Badge> : <Badge variant="gray">Inativo</Badge>}</Td>
                <Td><div onClick={e => e.stopPropagation()}><Btn variant="icon" sm onClick={() => deleteServ(s.id)}>×</Btn></div></Td>
              </tr>
            )) : <EmptyRow cols={6} text="Nenhum serviço" />}
          </tbody>
        </DataTable>
      </TableCard>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Serviço' : 'Novo Serviço'}
        footer={<><Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn><Btn onClick={save}>Salvar serviço</Btn></>}>
        <FormSection title="Dados do serviço">
          <FormGrid>
            <FormGroup label="Nome *"><input className={inputClass} value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></FormGroup>
            <FormGroup label="Tipo">
              <select className={selectClass} value={form.tipo || 'Instalação'} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {['Instalação','Manutenção','Consultoria','Projeto','Suporte'].map(t => <option key={t}>{t}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Valor base (R$)"><input type="number" className={inputClass} value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} /></FormGroup>
            <FormGroup label="Empresa(s) associada(s)" full>
              <select className={selectClass} value={form.empresa || 'all'} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}>
                <option value="all">Todas as empresas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Descrição" full><textarea className={textareaClass} value={form.desc || ''} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} /></FormGroup>
          </FormGrid>
        </FormSection>
      </Modal>
    </div>
  );
}
