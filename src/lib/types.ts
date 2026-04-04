export interface User {
  id: string;
  nome: string;
  email: string;
  senha: string;
  perfil: 'admin' | 'comercial' | 'prospectador' | 'visualizador';
  metaReais: number;
  comissao: number;
  ativo: boolean;
  empresas: string[];
  cargo: string;
  tel: string;
}

export interface PropostaConfig {
  id: string;
  negociacaoId?: string;
  criadoEm: string;
  atualizadoEm: string;
  dados: Record<string, any>;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  tel: string;
  email: string;
  resp: string;
  end: string;
  ativa: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  empresa: string;
  tel: string;
  email: string;
  doc: string;
  cidade: string;
  end: string;
  obs: string;
  // ── NOVO: parceiro que indicou o cliente ──
  indicacaoNome: string;   // nome do parceiro/arquiteto
  indicacaoId: string;     // id do parceiro (se cadastrado)
}

export interface HistoricoEntry {
  data: string;
  usuarioId: string;
  usuarioNome: string;
  acao: string;
  detalhes: string;
}

export interface Negociacao {
  id: string;
  codigo: string;
  titulo: string;
  clienteId: string;
  clienteNome: string;
  clienteTel: string;
  clienteEmail: string;
  empresa: string;
  responsavelId: string;
  responsavelNome: string;
  valor: number;
  status: 'contato' | 'levantamento' | 'proposta' | 'negociacao' | 'fechada' | 'perdida';
  prob: number;
  data: string;
  obs: string;
  anexos: Anexo[];
  historico: HistoricoEntry[];
  // ── NOVO: comissionamento ──
  indicacaoNome: string;   // parceiro que originou (herdado do cliente)
  indicacaoId: string;
}

export interface Anexo {
  id: string;
  nome: string;
  tipo: string;
  dataUrl: string;
  data: string;
}

export interface Recorrente {
  id: string;
  codigo: string;
  data: string;
  clienteId: string;
  clienteNome: string;
  produto: string;
  valor: number;
  dia: number;
  empresa: string;
  responsavelId: string;
  responsavelNome: string;
  status: 'ativo' | 'pausado' | 'cancelado';
  obs: string;
  anexos: Anexo[];
  // ── NOVO: comissionamento ──
  indicacaoNome: string;
  indicacaoId: string;
}

export interface Lead {
  id: string;
  nome: string;
  empresa: string;
  tel: string;
  email: string;
  origem: string;
  status: 'novo' | 'qualificado' | 'convertido' | 'descartado';
  empresaAst: string;
  prospectadorId: string;
  prospectadorNome: string;
  data: string;
  obs: string;
  // ── NOVO: tipo de conversão e indicação ──
  tipoProjeto: 'negociacao' | 'recorrente';  // define para onde vai ao converter
  indicacaoNome: string;                      // parceiro que indicou
  indicacaoId: string;
}

export interface Parceiro {
  id: string;
  nome: string;
  empresa: string;
  tel: string;
  email: string;
  tipo: string;
  empresaAst: string;
  obs: string;
}

export interface Produto {
  id: string;
  nome: string;
  cat: string;
  preco: number;
  marca: string;
  empresa: string;
  desc: string;
  ativo: boolean;
  estoque: number;
  localEstoque: 'estoque' | 'centro_distribuicao' | 'escritorio';
}

export interface Servico {
  id: string;
  nome: string;
  tipo: string;
  valor: number;
  empresa: string;
  desc: string;
  ativo: boolean;
}

export interface PropConfig {
  empresa: string;
  cnpj: string;
  end: string;
  tel: string;
}

export type NegStatus = Negociacao['status'];

export const PIPELINE_STAGES = [
  { key: 'contato' as const, label: 'Contato', color: '#5a5b63' },
  { key: 'levantamento' as const, label: 'Levantamento', color: '#2980b9' },
  { key: 'proposta' as const, label: 'Proposta', color: '#e67e22' },
  { key: 'negociacao' as const, label: 'Negociação', color: '#8e44ad' },
  { key: 'fechada' as const, label: 'Fechada ✓', color: '#27ae60' },
] as const;

export const PARTNER_TYPES = [
  'Arquiteto',
  'Engenheiro',
  'Vendedor Autônomo',
  'Consultor',
  'Outro',
];

export const PRODUCT_LOCATIONS = [
  { value: 'estoque', label: 'Estoque' },
  { value: 'centro_distribuicao', label: 'Centro de Distribuição' },
  { value: 'escritorio', label: 'Escritório' },
] as const;

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

// ── Comissionamento calculado ──────────────────────────────────────────────
// Produto: 5% | Serviço: 10%
export const COMISSAO_PRODUTO = 0.05;
export const COMISSAO_SERVICO = 0.10;
