import React, { useState } from 'react';
import { DB, uid, fmtDate, fmt, nextNegCode } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { Lead, Empresa, Parceiro, Cliente, Negociacao, Recorrente, User } from '@/lib/types';
import { PageHeader, Tabs, TableCard, DataTable, Th, Td, EmptyRow, LeadBadge, Btn } from '@/components/UIComponents';
import Modal, { FormSection, FormGrid, FormGroup, inputClass, selectClass, textareaClass } from '@/components/Modal';

const TABS = [
  { key: 'ativos',     label: 'Ativos' },
  { key: 'novo',       label: 'Novos' },
  { key: 'qualificado',label: 'Qualificados' },
  { key: 'convertido', label: 'Convertidos' },
  { key: 'descartado', label: 'Descartados' },
];

export default function LeadsPage() {
  const { user, isAdmin } = useAuth();
  const [filter, setFilter] = useState('ativos');
  const [modalOpen, setModalOpen] = useState(false);
  const [convertModal, setConvertModal] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [convertForm, setConvertForm] = useState<{
    tipoProjeto: 'negociacao' | 'recorrente';
    titulo: string;
    empresa: string;
    responsavelId: string;
    obs: string;
  }>({
    tipoProjeto: 'negociacao',
    titulo: '',
    empresa: '',
    responsavelId: '',
    obs: '',
  });
  const [form, setForm] = useState<Partial<Lead>>({});
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const empresas  = DB.get<Empresa>('empresas');
  const parceiros = DB.get<Parceiro>('parceiros');
  const users     = DB.get<User>('users').filter(u => u.ativo !== false);

  // Leads filtrados por usuário: não-admin vê apenas os seus
  let leads = DB.get<Lead>('leads');
  if (!isAdmin) {
    leads = leads.filter(l => l.prospectadorId === user?.id);
  }

  // Filtro por aba
  if (filter === 'ativos') {
    leads = leads.filter(l => l.status !== 'convertido' && l.status !== 'descartado');
  } else {
    leads = leads.filter(l => l.status === filter);
  }

  // ── Novo lead ──────────────────────────────────────────────────────────
  const openNew = () => {
    setForm({
      origem: 'Instagram',
      status: 'novo',
      empresaAst: 'all',
      tipoProjeto: 'negociacao',
      indicacaoNome: '',
      indicacaoId: '',
    });
    setModalOpen(true);
  };

  const save = () => {
    if (!form.nome?.trim()) return;
    const lead: Lead = {
      id: uid(),
      nome: form.nome || '',
      empresa: form.empresa || '',
      tel: form.tel || '',
      email: form.email || '',
      origem: form.origem || 'Instagram',
      status: (form.status as Lead['status']) || 'novo',
      empresaAst: form.empresaAst || 'all',
      prospectadorId: user?.id || '',
      prospectadorNome: user?.nome || '',
      data: new Date().toISOString().split('T')[0],
      obs: form.obs || '',
      tipoProjeto: form.tipoProjeto || 'negociacao',
      indicacaoNome: form.indicacaoNome || '',
      indicacaoId: form.indicacaoId || '',
    };
    const arr = DB.get<Lead>('leads');
    arr.push(lead);
    DB.set('leads', arr);
    setModalOpen(false);
    refresh();
  };

  // ── Abrir modal de conversão ───────────────────────────────────────────
  const openConvert = (id: string) => {
    const lead = DB.get<Lead>('leads').find(l => l.id === id);
    if (!lead) return;
    setConvertingLead(lead);
    setConvertForm({
      tipoProjeto: lead.tipoProjeto || 'negociacao',
      titulo: lead.nome,
      empresa: lead.empresaAst !== 'all' ? lead.empresaAst : '',
      // responsável padrão: quem cadastrou o lead
      responsavelId: lead.prospectadorId || user?.id || '',
      obs: lead.obs || '',
    });
    setConvertModal(true);
  };

  // ── Confirmar conversão ────────────────────────────────────────────────
  const confirmConvert = () => {
    if (!convertingLead) return;

    // Marcar lead como convertido
    const allLeads = DB.get<Lead>('leads');
    const idx = allLeads.findIndex(l => l.id === convertingLead.id);
    if (idx < 0) return;
    allLeads[idx].status = 'convertido';
    // Guardar quem converteu e para qual vendedor foi atribuído
    allLeads[idx].prospectadorId   = convertingLead.prospectadorId;
    allLeads[idx].prospectadorNome = convertingLead.prospectadorNome;
    DB.set('leads', allLeads);

    // Criar ou reutilizar cliente
    const clientes = DB.get<Cliente>('clientes');
    let cli = clientes.find(c =>
      c.nome.toLowerCase() === convertingLead.nome.toLowerCase()
    );
    if (!cli) {
      cli = {
        id: uid(),
        nome: convertingLead.nome,
        empresa: convertingLead.empresa || '',
        tel: convertingLead.tel || '',
        email: convertingLead.email || '',
        cidade: '', end: '', doc: '',
        obs: 'Convertido de lead',
        indicacaoNome: convertingLead.indicacaoNome || '',
        indicacaoId: convertingLead.indicacaoId || '',
      };
      clientes.push(cli);
      DB.set('clientes', clientes);
    }

    const resp = users.find(u => u.id === convertForm.responsavelId);

    if (convertForm.tipoProjeto === 'negociacao') {
      const neg: Negociacao = {
        id: uid(),
        codigo: nextNegCode(),
        titulo: convertForm.titulo || convertingLead.nome,
        clienteId: cli.id,
        clienteNome: cli.nome,
        clienteTel: cli.tel,
        clienteEmail: cli.email,
        empresa: convertForm.empresa || '',
        responsavelId: convertForm.responsavelId || '',
        responsavelNome: resp?.nome || '',
        valor: 0,
        status: 'contato',
        prob: 50,
        data: new Date().toISOString().split('T')[0],
        obs: convertForm.obs || '',
        anexos: [],
        historico: [{
          data: new Date().toISOString(),
          usuarioId: user?.id || '',
          usuarioNome: user?.nome || '',
          acao: 'Criação',
          detalhes: `Convertido do lead — Origem: ${convertingLead.origem}${convertingLead.indicacaoNome ? ` — Indicação: ${convertingLead.indicacaoNome}` : ''}`,
        }],
        indicacaoNome: convertingLead.indicacaoNome || '',
        indicacaoId: convertingLead.indicacaoId || '',
      };
      const negs = DB.get<Negociacao>('negociacoes');
      negs.push(neg);
      DB.set('negociacoes', negs);

    } else {
      const recs = DB.get<Recorrente>('recorrentes');
      const rec: Recorrente = {
        id: uid(),
        codigo: 'REC-' + String(recs.length + 1).padStart(3, '0'),
        data: new Date().toISOString().split('T')[0],
        clienteId: cli.id,
        clienteNome: cli.nome,
        produto: convertForm.titulo || '',
        valor: 0,
        dia: 1,
        empresa: convertForm.empresa || '',
        responsavelId: convertForm.responsavelId || '',
        responsavelNome: resp?.nome || '',
        status: 'ativo',
        obs: convertForm.obs || '',
        anexos: [],
        indicacaoNome: convertingLead.indicacaoNome || '',
        indicacaoId: convertingLead.indicacaoId || '',
      };
      recs.push(rec);
      DB.set('recorrentes', recs);
    }

    setConvertModal(false);
    setConvertingLead(null);
    refresh();
  };

  // ── Excluir lead ───────────────────────────────────────────────────────
  const deleteLead = (id: string) => {
    if (!confirm('Excluir lead?')) return;
    DB.set('leads', DB.get<Lead>('leads').filter(l => l.id !== id));
    refresh();
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="" titleEm="LEADS" sub="Prospecção e qualificação">
        <Btn onClick={openNew}>+ Novo Lead</Btn>
      </PageHeader>

      <Tabs tabs={TABS} active={filter} onChange={setFilter} />

      <TableCard title={`${leads.length} lead${leads.length !== 1 ? 's' : ''}`}>
        <DataTable>
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>Empresa</Th>
              <Th>Contato</Th>
              <Th>Origem</Th>
              <Th>Tipo</Th>
              <Th>Indicação</Th>
              <Th>Status</Th>
              <Th>Prospectador</Th>
              <Th>Data</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {leads.length ? leads.map(l => (
              <tr key={l.id}>
                <Td><strong className="text-foreground font-semibold">{l.nome}</strong></Td>
                <Td>{l.empresa || '—'}</Td>
                <Td>{l.tel || l.email || '—'}</Td>
                <Td>{l.origem}</Td>
                <Td>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    l.tipoProjeto === 'recorrente'
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-purple-500/15 text-purple-400'
                  }`}>
                    {l.tipoProjeto === 'recorrente' ? '↻ Recorrente' : '◇ Projeto'}
                  </span>
                </Td>
                <Td>{l.indicacaoNome || '—'}</Td>
                <Td><LeadBadge status={l.status} /></Td>
                <Td>{l.prospectadorNome || '—'}</Td>
                <Td>{fmtDate(l.data)}</Td>
                <Td>
                  <div className="flex gap-1">
                    {l.status !== 'convertido' && l.status !== 'descartado' && (
                      <Btn variant="secondary" sm onClick={() => openConvert(l.id)}>
                        Converter
                      </Btn>
                    )}
                    {l.status === 'convertido' && (
                      <span className="text-[10px] text-green-400 font-semibold px-2">✓ Convertido</span>
                    )}
                    <Btn variant="icon" sm onClick={() => deleteLead(l.id)}>×</Btn>
                  </div>
                </Td>
              </tr>
            )) : <EmptyRow cols={10} text="Nenhum lead" />}
          </tbody>
        </DataTable>
      </TableCard>

      {/* ── MODAL NOVO LEAD ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Lead"
        footer={<>
          <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn>
          <Btn onClick={save}>Salvar lead</Btn>
        </>}
      >
        <FormSection title="Dados do lead">
          <FormGrid>
            <FormGroup label="Nome *">
              <input className={inputClass} value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Empresa">
              <input className={inputClass} value={form.empresa || ''} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Telefone">
              <input className={inputClass} value={form.tel || ''} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} />
            </FormGroup>
            <FormGroup label="E-mail">
              <input className={inputClass} value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Origem">
              <select className={selectClass} value={form.origem || 'Instagram'} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))}>
                {['Instagram', 'WhatsApp', 'Indicação', 'Site', 'Prospecção ativa', 'Evento', 'Outro'].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="Tipo de projeto">
              <select className={selectClass} value={form.tipoProjeto || 'negociacao'} onChange={e => setForm(f => ({ ...f, tipoProjeto: e.target.value as any }))}>
                <option value="negociacao">◇ Projeto (Negociação)</option>
                <option value="recorrente">↻ Recorrente (Contrato)</option>
              </select>
            </FormGroup>
            <FormGroup label="Status">
              <select className={selectClass} value={form.status || 'novo'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Lead['status'] }))}>
                <option value="novo">Novo</option>
                <option value="qualificado">Qualificado</option>
                <option value="descartado">Descartado</option>
              </select>
            </FormGroup>
            <FormGroup label="Empresa AST associada">
              <select className={selectClass} value={form.empresaAst || 'all'} onChange={e => setForm(f => ({ ...f, empresaAst: e.target.value }))}>
                <option value="all">Todas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Indicação (parceiro / arquiteto)">
              <select
                className={selectClass}
                value={form.indicacaoId || ''}
                onChange={e => {
                  const par = parceiros.find(p => p.id === e.target.value);
                  setForm(f => ({ ...f, indicacaoId: e.target.value, indicacaoNome: par?.nome || '' }));
                }}
              >
                <option value="">Sem indicação</option>
                {parceiros.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}{p.empresa ? ` — ${p.empresa}` : ''}</option>
                ))}
              </select>
            </FormGroup>
            {!form.indicacaoId && (
              <FormGroup label="Nome do indicador (se não cadastrado)">
                <input
                  className={inputClass}
                  placeholder="Ex: Arq. João Silva"
                  value={form.indicacaoNome || ''}
                  onChange={e => setForm(f => ({ ...f, indicacaoNome: e.target.value }))}
                />
              </FormGroup>
            )}
            <FormGroup label="Observações" full>
              <textarea className={textareaClass} value={form.obs || ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
            </FormGroup>
          </FormGrid>
        </FormSection>
      </Modal>

      {/* ── MODAL DE CONVERSÃO ── */}
      <Modal
        open={convertModal}
        onClose={() => setConvertModal(false)}
        title={`Converter lead — ${convertingLead?.nome || ''}`}
        footer={<>
          <Btn variant="secondary" onClick={() => setConvertModal(false)}>Cancelar</Btn>
          <Btn onClick={confirmConvert}>
            {convertForm.tipoProjeto === 'negociacao' ? '◇ Criar negociação' : '↻ Criar recorrente'}
          </Btn>
        </>}
      >
        <FormSection title="Destino da conversão">
          <FormGrid>
            <FormGroup label="Tipo de projeto">
              <select
                className={selectClass}
                value={convertForm.tipoProjeto}
                onChange={e => setConvertForm(f => ({ ...f, tipoProjeto: e.target.value as any }))}
              >
                <option value="negociacao">◇ Projeto (Negociação)</option>
                <option value="recorrente">↻ Recorrente (Contrato)</option>
              </select>
            </FormGroup>
            <FormGroup label={convertForm.tipoProjeto === 'negociacao' ? 'Título da negociação' : 'Produto / serviço'}>
              <input
                className={inputClass}
                placeholder={convertForm.tipoProjeto === 'negociacao' ? 'Ex: Automação residencial…' : 'Ex: Manutenção mensal…'}
                value={convertForm.titulo}
                onChange={e => setConvertForm(f => ({ ...f, titulo: e.target.value }))}
              />
            </FormGroup>
            <FormGroup label="Empresa AST">
              <select
                className={selectClass}
                value={convertForm.empresa}
                onChange={e => setConvertForm(f => ({ ...f, empresa: e.target.value }))}
              >
                <option value="">Selecionar…</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Vendedor responsável">
              <select
                className={selectClass}
                value={convertForm.responsavelId}
                onChange={e => setConvertForm(f => ({ ...f, responsavelId: e.target.value }))}
                // Não-admin só pode atribuir a si mesmo
                disabled={!isAdmin}
              >
                <option value="">Selecionar…</option>
                {(isAdmin ? users : users.filter(u => u.id === user?.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="Observações" full>
              <textarea
                className={textareaClass}
                value={convertForm.obs}
                onChange={e => setConvertForm(f => ({ ...f, obs: e.target.value }))}
              />
            </FormGroup>
          </FormGrid>
        </FormSection>

        {convertingLead?.indicacaoNome && (
          <div className="mt-4 p-3 bg-ast-bg3 border border-border rounded-lg">
            <div className="text-[10px] text-ast-text3 uppercase tracking-wider mb-1">Comissionamento</div>
            <div className="text-sm text-foreground font-semibold">{convertingLead.indicacaoNome}</div>
            <div className="text-xs text-ast-text3 mt-1">5% sobre produtos · 10% sobre serviços</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
