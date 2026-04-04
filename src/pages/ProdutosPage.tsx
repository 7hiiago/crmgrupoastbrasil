import React, { useState } from 'react';
import { DB, uid, fmt } from '@/lib/db';
import type { Produto, Empresa } from '@/lib/types';
import { PRODUCT_LOCATIONS } from '@/lib/types';
import { PageHeader, TableCard, DataTable, Th, Td, EmptyRow, Badge, Btn } from '@/components/UIComponents';
import Modal, { FormSection, FormGrid, FormGroup, inputClass, selectClass, textareaClass } from '@/components/Modal';

export default function ProdutosPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Produto>>({});
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const empresas = DB.get<Empresa>('empresas');
  const produtos  = DB.get<Produto>('produtos');

  const openNew = () => {
    setEditingId(null);
    setForm({ ativo: true, estoque: 0, localEstoque: 'estoque', empresa: 'all', custoInstalacao: 0 });
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const p = produtos.find(p => p.id === id);
    if (p) { setEditingId(p.id); setForm({ ...p }); setModalOpen(true); }
  };

  const save = () => {
    if (!form.nome?.trim()) return;
    const prod: Produto = {
      id: editingId || uid(),
      nome: form.nome || '',
      cat: form.cat || '',
      preco: form.preco || 0,
      marca: form.marca || '',
      empresa: form.empresa || 'all',
      desc: form.desc || '',
      ativo: true,
      estoque: form.estoque || 0,
      localEstoque: (form.localEstoque as Produto['localEstoque']) || 'estoque',
      custoInstalacao: form.custoInstalacao || 0,
    };
    const arr = DB.get<Produto>('produtos');
    const idx = arr.findIndex(p => p.id === prod.id);
    if (idx > -1) arr[idx] = prod; else arr.push(prod);
    DB.set('produtos', arr);
    setModalOpen(false);
    refresh();
  };

  const deleteProd = (id: string) => {
    if (!confirm('Excluir produto?')) return;
    DB.set('produtos', DB.get<Produto>('produtos').filter(p => p.id !== id));
    refresh();
  };

  const locationLabel = (loc: string) =>
    PRODUCT_LOCATIONS.find(l => l.value === loc)?.label || loc;

  return (
    <div>
      <PageHeader title="PRODU" titleEm="TOS" sub="Catálogo de produtos">
        <Btn onClick={openNew}>+ Novo Produto</Btn>
      </PageHeader>

      <TableCard>
        <DataTable>
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>Categoria</Th>
              <Th>Preço</Th>
              <Th>Custo instalação</Th>
              <Th>Estoque</Th>
              <Th>Local</Th>
              <Th>Empresa</Th>
              <Th>Ativo</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {produtos.length ? produtos.map(p => (
              <tr
                key={p.id}
                className={`hover:bg-ast-bg3 cursor-pointer ${(p.estoque || 0) <= 0 ? 'bg-primary/5' : ''}`}
                onClick={() => openEdit(p.id)}
              >
                <Td>
                  <strong className={`font-semibold ${(p.estoque || 0) <= 0 ? 'text-primary' : 'text-foreground'}`}>
                    {p.nome}
                  </strong>
                  {p.marca && <div className="text-[10px] text-ast-text3">{p.marca}</div>}
                </Td>
                <Td>{p.cat || '—'}</Td>
                <Td>R$ {fmt(p.preco || 0)}</Td>
                <Td>
                  {p.custoInstalacao > 0
                    ? <span className="text-ast-text2">R$ {fmt(p.custoInstalacao)}<span className="text-[10px] text-ast-text3 ml-1">/un</span></span>
                    : <span className="text-ast-text3">—</span>}
                </Td>
                <Td>
                  <span className={`font-bold ${(p.estoque || 0) <= 0 ? 'text-primary' : 'text-ast-green'}`}>
                    {p.estoque || 0}
                  </span>
                  {(p.estoque || 0) <= 0 && (
                    <span className="text-[9px] text-primary ml-1 uppercase tracking-wider">Repor</span>
                  )}
                </Td>
                <Td>
                  <Badge variant={(p.estoque || 0) <= 0 ? 'red' : 'blue'}>
                    {locationLabel(p.localEstoque)}
                  </Badge>
                </Td>
                <Td>{p.empresa === 'all' ? 'Todas' : empresas.find(e => e.id === p.empresa)?.nome || '—'}</Td>
                <Td>
                  {p.ativo !== false
                    ? <Badge variant="green">Ativo</Badge>
                    : <Badge variant="gray">Inativo</Badge>}
                </Td>
                <Td>
                  <div onClick={e => e.stopPropagation()}>
                    <Btn variant="icon" sm onClick={() => deleteProd(p.id)}>×</Btn>
                  </div>
                </Td>
              </tr>
            )) : <EmptyRow cols={9} text="Nenhum produto" />}
          </tbody>
        </DataTable>
      </TableCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Produto' : 'Novo Produto'}
        footer={<>
          <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn>
          <Btn onClick={save}>Salvar produto</Btn>
        </>}
      >
        <FormSection title="Dados do produto">
          <FormGrid>
            <FormGroup label="Nome *">
              <input className={inputClass} value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Categoria">
              <input className={inputClass} value={form.cat || ''} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))} placeholder="Ex: Automação, Áudio…" />
            </FormGroup>
            <FormGroup label="Marca / Fabricante">
              <input className={inputClass} value={form.marca || ''} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Preço de venda (R$)">
              <input type="number" className={inputClass} value={form.preco || ''} onChange={e => setForm(f => ({ ...f, preco: parseFloat(e.target.value) || 0 }))} />
            </FormGroup>
          </FormGrid>
        </FormSection>

        <FormSection title="🔧 Instalação">
          <div className="mb-3 p-3 bg-ast-bg3 rounded-lg border border-border text-xs text-ast-text2">
            O custo de instalação por unidade é usado para <strong className="text-foreground">calcular automaticamente o valor de serviço</strong> na proposta conforme a quantidade do produto adicionada.
          </div>
          <FormGrid>
            <FormGroup label="Custo de instalação por unidade (R$)">
              <input
                type="number"
                className={inputClass}
                value={form.custoInstalacao || ''}
                placeholder="Ex: 350,00"
                onChange={e => setForm(f => ({ ...f, custoInstalacao: parseFloat(e.target.value) || 0 }))}
              />
            </FormGroup>
            <FormGroup label="Exemplo automático">
              <div className="bg-ast-bg3 border border-border rounded px-3 py-2 text-xs text-ast-text2">
                {form.custoInstalacao && form.custoInstalacao > 0
                  ? <>Ao adicionar <strong className="text-foreground">5 un.</strong> na proposta → serviço sugerido: <strong className="text-primary">R$ {fmt((form.custoInstalacao || 0) * 5)}</strong></>
                  : <span className="text-ast-text3">Preencha o custo acima para ver o cálculo</span>}
              </div>
            </FormGroup>
          </FormGrid>
        </FormSection>

        <FormSection title="Estoque">
          <FormGrid>
            <FormGroup label="Quantidade em estoque">
              <input type="number" min={0} className={inputClass} value={form.estoque ?? 0} onChange={e => setForm(f => ({ ...f, estoque: parseInt(e.target.value) || 0 }))} />
            </FormGroup>
            <FormGroup label="Local do estoque">
              <select className={selectClass} value={form.localEstoque || 'estoque'} onChange={e => setForm(f => ({ ...f, localEstoque: e.target.value as Produto['localEstoque'] }))}>
                {PRODUCT_LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Empresa(s) associada(s)" full>
              <select className={selectClass} value={form.empresa || 'all'} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}>
                <option value="all">Todas as empresas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Descrição" full>
              <textarea className={textareaClass} value={form.desc || ''} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
            </FormGroup>
          </FormGrid>
        </FormSection>
      </Modal>
    </div>
  );
}
