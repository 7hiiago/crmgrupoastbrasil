export interface User {
  id: string;
  nome: string;
  email: string;
  senha: string;
  perfil: 'admin' | 'comercial' | 'prospectador' | 'visualizador';
  metaReais: number; // Meta em R$
  comissao: number; // Comissão em %
  ativo: boolean;
  empresas: string[]; // IDs das empresas vinculadas (multi-empresa)
  cargo: string;
  tel: string;
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
}

export interface Anexo {
  id: string;
  nome: string;
  tipo: string;
  dataUrl: string; // base64
  data: string;
}

export interface Recorrente {
  id: string;
  codigo: string;
  data: string; // data início
  clienteId: string;
  clienteNome: string;
  produto: string;
  valor: number;
  dia: number;
  empresa: string; // empresa AST
  responsavelId: string;
  responsavelNome: string;
  status: 'ativo' | 'pausado' | 'cancelado';
  obs: string;
  anexos: Anexo[];
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
}

export interface Parceiro {
  id: string;
  nome: string;
  empresa: string;
  tel: string;
  email: string;
  tipo: string; // arquiteto, engenheiro, vendedor autônomo, etc.
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
