import React, { useState } from 'react';
import { DB, uid, fmt } from '@/lib/db';
import type { Cliente, Negociacao, Parceiro } from '@/lib/types';
import { COMISSAO_PRODUTO, COMISSAO_SERVICO } from '@/lib/types';
import { PageHeader, TableCard, DataTable, Th, Td, EmptyRow, Btn } from '@/components/UIComponents';
import Modal, { FormSection, FormGrid, FormGroup, inputClass, selectClass, textareaClass } from '@/components/Modal';

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [comissaoModal, setComissaoModal] = useState(false);
  const [comissaoCliente, setComissaoCliente] = useState<Cliente | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Cliente>>({});
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  let clientes = DB.get<Cliente>('clientes');
  const negs = DB.get<Negociacao>('negociacoes');
  const parceiros = DB.get<Parceiro>('parceiros');

  if (search) {
    const lq = search.toLowerCase();
    clientes = clientes.filter(c =>
      c.nome.toLowerCase().includes(lq) ||
      c.empresa?.toLowerCase().includes(lq) ||
      c.indicacaoNome?.toLowerCase().includes(lq)
    );
  }

  const openNew = () => {
    setEditingId(null);
    setForm({ indicacaoNome: '', indicacaoId: '' });
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const c = clientes.find(c => c.id === id);
    if (c) { setEditingId(c.id); setForm({ ...c }); setModalOpen(true); }
  };

  const save = () => {
    if (!form.nome?.trim()) return;
    const cli: Cliente = {
      id: editingId || uid(),
      nome: form.nome || '',
      empresa: form.empresa || '',
      tel: form.tel || '',
      email: form.email || '',
      doc: form.doc || '',
      cidade: form.cidade || '',
      end: form.end || '',
      obs: form.obs || '',
      indicacaoNome: form.indicacaoNome || '',
      indicacaoId: form.indicacaoId || '',
    };
    const arr = DB.get<Cliente>('clientes');
    const idx = arr.findIndex(c => c.id === cli.id);
    if (idx > -1) arr[idx] = cli; else arr.push(cli);
    DB.set('clientes', arr);
    setModalOpen(false);
    refresh();
  };

  const deleteCli = (id: string) => {
    if (!confirm('Excluir cliente?')) return;
    DB.set('clientes', DB.get<Cliente>('clientes').filter(c => c.id !== id));
    refresh();
  };

  // ── Calcular comissão do parceiro por cliente ──────────────────────────
  const calcComissao = (clienteId: string) => {
    const negsCli = negs.filter(n => n.clienteId === clienteId);
    let totalProduto = 0;
    let totalServico = 0;

    negsCli.forEach(n => {
      try {
        const salvo = DB.get<any>(`proposta_${n.id}`);
        if (salvo && salvo.length > 0) {
          const secoes = salvo[0].secoes || [];
          secoes.forEach((s: any) => {
            const prod = s.itens?.reduce((acc: number, i: any) => acc + (i.qtd * i.valorUnd), 0) || 0;
            totalProduto += prod;
            totalServico += s.servicoValor || 0;
          });
        }
      } catch {}
    });

    return {
      totalProduto,
      totalServico,
      comissaoProduto: totalProduto * COMISSAO_PRODUTO,
      comissaoServico: totalServico * COMISSAO_SERVICO,
      total: totalProduto * COMISSAO_PRODUTO + totalServico * COMISSAO_SERVICO,
    };
  };

  const openComissao = (c: Cliente) => {
    setComissaoCliente(c);
    setComissaoModal(true);
  };

  return (
    <div>
      <PageHeader title="CLIEN" titleEm="TES" sub="Cadastro de clientes">
        <Btn onClick={openNew}>+ Novo Cliente</Btn>
      </PageHeader>

      <TableCard
        title={`${clientes.length} cliente${clientes.length !== 1 ? 's' : ''}`}
        headerRight={
          <input
            type="text"
            placeholder="Buscar…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-ast-bg3 border border-border rounded px-2.5 py-1.5 text-foreground text-xs w-40"
          />
        }
      >
        <DataTable>
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>Empresa</Th>
              <Th>Telefone</Th>
              <Th>E-mail</Th>
              <Th>Cidade</Th>
              <Th>Indicação</Th>
              <Th>Neg.</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {clientes.length ? clientes.map(c => (
              <tr key={c.id} className="hover:bg-ast-bg3 cursor-pointer" onClick={() => openEdit(c.id)}>
                <Td><strong className="text-foreground font-semibold">{c.nome}</strong></Td>
                <Td>{c.empresa || '—'}</Td>
                <Td>{c.tel || '—'}</Td>
                <Td>{c.email || '—'}</Td>
                <Td>{c.cidade || '—'}</Td>
                <Td>
                  {c.indicacaoNome ? (
                    <span className="text-xs text-amber-400 font-medium">
                      🤝 {c.indicacaoNome}
                    </span>
                  ) : '—'}
                </Td>
                <Td>{negs.filter(n => n.clienteId === c.id).length}</Td>
                <Td>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {c.indicacaoNome && (
                      <Btn variant="icon" sm onClick={() => openComissao(c)} title="Ver comissionamento">
                        💰
                      </Btn>
                    )}
                    <Btn variant="icon" sm onClick={() => deleteCli(c.id)}>×</Btn>
                  </div>
                </Td>
              </tr>
            )) : <EmptyRow cols={8} text="Nenhum cliente cadastrado" />}
          </tbody>
        </DataTable>
      </TableCard>

      {/* ── MODAL CLIENTE ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Cliente' : 'Novo Cliente'}
        footer={<>
          <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn>
          <Btn onClick={save}>Salvar cliente</Btn>
        </>}
      >
        <FormSection title="Dados pessoais">
          <FormGrid>
            <FormGroup label="Nome completo *">
              <input className={inputClass} value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Empresa (opcional)">
              <input className={inputClass} value={form.empresa || ''} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Telefone / WhatsApp">
              <input className={inputClass} value={form.tel || ''} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} />
            </FormGroup>
            <FormGroup label="E-mail">
              <input className={inputClass} value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </FormGroup>
            <FormGroup label="CPF / CNPJ">
              <input className={inputClass} value={form.doc || ''} onChange={e => setForm(f => ({ ...f, doc: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Cidade">
              <input className={inputClass} value={form.cidade || ''} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Endereço" full>
              <input className={inputClass} value={form.end || ''} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Observações" full>
              <textarea className={textareaClass} value={form.obs || ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
            </FormGroup>
          </FormGrid>
        </FormSection>

        <FormSection title="Indicação / Comissionamento">
          <FormGrid>
            <FormGroup label="Parceiro que indicou">
              <select
                className={selectClass}
                value={form.indicacaoId || ''}
                onChange={e => {
                  const par = parceiros.find(p => p.id === e.target.value);
                  setForm(f => ({
                    ...f,
                    indicacaoId: e.target.value,
                    indicacaoNome: par?.nome || '',
                  }));
                }}
              >
                <option value="">Sem indicação</option>
                {parceiros.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome}{p.empresa ? ` — ${p.empresa}` : ''}
                  </option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="Nome do indicador (se não cadastrado)">
              <input
                className={inputClass}
                placeholder="Ex: Arq. João Silva"
                value={form.indicacaoNome || ''}
                onChange={e => setForm(f => ({ ...f, indicacaoNome: e.target.value, indicacaoId: '' }))}
                disabled={!!form.indicacaoId}
              />
            </FormGroup>
          </FormGrid>
          {(form.indicacaoNome || form.indicacaoId) && (
            <div className="mt-3 p-3 bg-ast-bg3 rounded-lg border border-border text-xs text-ast-text3">
              💰 Comissão: <strong className="text-foreground">5% sobre produtos</strong> e <strong className="text-foreground">10% sobre serviços</strong> das negociações deste cliente.
            </div>
          )}
        </FormSection>
      </Modal>

      {/* ── MODAL COMISSIONAMENTO ── */}
      <Modal
        open={comissaoModal}
        onClose={() => setComissaoModal(false)}
        title={`Comissionamento — ${comissaoCliente?.nome || ''}`}
      >
        {comissaoCliente && (() => {
          const c = calcComissao(comissaoCliente.id);
          return (
            <div className="space-y-4">
              <div className="p-3 bg-ast-bg3 rounded-lg border border-border">
                <div className="text-xs text-ast-text3 mb-1">Parceiro indicador</div>
                <div className="text-sm font-semibold text-foreground">🤝 {comissaoCliente.indicacaoNome}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-ast-bg3 rounded-lg border border-border">
                  <div className="text-[10px] text-ast-text3 uppercase tracking-wider mb-1">Total em produtos</div>
                  <div className="text-sm font-bold text-foreground">R$ {fmt(c.totalProduto)}</div>
                  <div className="text-xs text-amber-400 mt-1">Comissão (5%): R$ {fmt(c.comissaoProduto)}</div>
                </div>
                <div className="p-3 bg-ast-bg3 rounded-lg border border-border">
                  <div className="text-[10px] text-ast-text3 uppercase tracking-wider mb-1">Total em serviços</div>
                  <div className="text-sm font-bold text-foreground">R$ {fmt(c.totalServico)}</div>
                  <div className="text-xs text-amber-400 mt-1">Comissão (10%): R$ {fmt(c.comissaoServico)}</div>
                </div>
              </div>

              <div className="p-4 rounded-lg border" style={{ background: 'rgba(227,0,15,0.08)', borderColor: 'rgba(227,0,15,0.3)' }}>
                <div className="text-[10px] text-ast-text3 uppercase tracking-wider mb-1">Total a comissionar</div>
                <div className="text-2xl font-black text-primary">R$ {fmt(c.total)}</div>
                <div className="text-xs text-ast-text3 mt-1">
                  Baseado em {negs.filter(n => n.clienteId === comissaoCliente.id).length} negociação(ões)
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
