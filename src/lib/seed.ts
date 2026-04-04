import { DB } from './db';
import type { Empresa, Cliente, Negociacao, Lead, Produto, Servico, User } from './types';

export function seedDemoData() {
  if (DB.get('seeded').length) return;

  const mo = (offset = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d.toISOString().split('T')[0];
  };

  DB.set<Empresa>('empresas', [
    { id: 'e1', nome: 'AST Automação', cnpj: '35.794.626/0001-00', tel: '81 4042.3084', email: 'contato@grupoast.com.br', resp: 'Admin', end: 'Av. Adjar da Silva Casé, 800, Caruaru', ativa: true },
    { id: 'e2', nome: 'AST Sonorização', cnpj: '35.794.626/0002-88', tel: '81 4042.3084', email: 'som@grupoast.com.br', resp: 'Admin', end: 'Av. Adjar da Silva Casé, 800, Caruaru', ativa: true },
  ]);

  DB.set<Cliente>('clientes', [
    { id: 'c1', nome: 'Valmir Andrade', empresa: 'Construtora Andrade', tel: '(81) 99111-2222', email: 'valmir@construtora.com', cidade: 'Caruaru', end: 'Rua das Flores, 100', obs: '', doc: '' },
    { id: 'c2', nome: 'Maria Santos', empresa: '', tel: '(81) 98888-3333', email: 'maria@gmail.com', cidade: 'Caruaru', end: '', obs: '', doc: '' },
    { id: 'c3', nome: 'Pedro Costa', empresa: 'Costa Empreendimentos', tel: '(81) 97777-4444', email: 'pedro@costa.com', cidade: 'Recife', end: '', obs: '', doc: '' },
  ]);

  DB.set<Negociacao>('negociacoes', [
    { id: 'n1', codigo: 'AST-001', titulo: 'Automação residencial completa', clienteId: 'c1', clienteNome: 'Valmir Andrade', clienteTel: '', clienteEmail: '', empresa: 'e1', responsavelId: 'u1', responsavelNome: 'Administrador', valor: 28000, status: 'proposta', prob: 70, data: mo(-1), obs: '', anexos: [], historico: [] },
    { id: 'n2', codigo: 'AST-002', titulo: 'Sistema de som ambiente', clienteId: 'c2', clienteNome: 'Maria Santos', clienteTel: '', clienteEmail: '', empresa: 'e2', responsavelId: 'u1', responsavelNome: 'Administrador', valor: 12500, status: 'fechada', prob: 100, data: mo(-2), obs: '', anexos: [], historico: [] },
    { id: 'n3', codigo: 'AST-003', titulo: 'Home cinema + automação', clienteId: 'c3', clienteNome: 'Pedro Costa', clienteTel: '', clienteEmail: '', empresa: 'e1', responsavelId: 'u1', responsavelNome: 'Administrador', valor: 45000, status: 'negociacao', prob: 55, data: mo(0), obs: '', anexos: [], historico: [] },
    { id: 'n4', codigo: 'AST-004', titulo: 'Sonorização comercial', clienteId: 'c1', clienteNome: 'Valmir Andrade', clienteTel: '', clienteEmail: '', empresa: 'e2', responsavelId: 'u1', responsavelNome: 'Administrador', valor: 8800, status: 'fechada', prob: 100, data: mo(-3), obs: '', anexos: [], historico: [] },
  ]);

  DB.set<Lead>('leads', [
    { id: 'l1', nome: 'João Ferreira', empresa: 'Ferreira Construtora', tel: '(81) 96666-5555', email: 'joao@ferreira.com', origem: 'Instagram', status: 'novo', empresaAst: 'e1', prospectadorId: 'u1', prospectadorNome: 'Administrador', data: mo(0), obs: 'Interessado em automação' },
    { id: 'l2', nome: 'Ana Lima', empresa: '', tel: '(81) 95555-6666', email: 'ana@gmail.com', origem: 'Indicação', status: 'qualificado', empresaAst: 'all', prospectadorId: 'u1', prospectadorNome: 'Administrador', data: mo(0), obs: '' },
  ]);

  DB.set<Produto>('produtos', [
    { id: 'p1', nome: 'Central de Automação Smart Home', cat: 'Automação', preco: 3500, marca: 'HDL', empresa: 'all', desc: '', ativo: true, estoque: 5, localEstoque: 'estoque' },
    { id: 'p2', nome: 'Amplificador Ambiente 4 Zonas', cat: 'Sonorização', preco: 1800, marca: 'Yamaha', empresa: 'all', desc: '', ativo: true, estoque: 3, localEstoque: 'estoque' },
    { id: 'p3', nome: 'Subwoofer de Embutir 8"', cat: 'Sonorização', preco: 950, marca: 'JBL', empresa: 'all', desc: '', ativo: true, estoque: 0, localEstoque: 'centro_distribuicao' },
    { id: 'p4', nome: 'Receiver AV 8K', cat: 'Home Cinema', preco: 5200, marca: 'Yamaha', empresa: 'all', desc: '', ativo: true, estoque: 2, localEstoque: 'escritorio' },
  ]);

  DB.set<Servico>('servicos', [
    { id: 's1', nome: 'Instalação e programação', tipo: 'Instalação', valor: 2500, empresa: 'all', desc: '', ativo: true },
    { id: 's2', nome: 'Projeto técnico', tipo: 'Projeto', valor: 1200, empresa: 'all', desc: '', ativo: true },
    { id: 's3', nome: 'Manutenção preventiva', tipo: 'Manutenção', valor: 350, empresa: 'all', desc: '', ativo: true },
  ]);

  DB.set('parceiros', []);
  DB.set('recorrentes', []);
  DB.set('seeded', ['1']);
}

export function initUsers() {
  const users = DB.get<User>('users');
  if (!users.length) {
    DB.set<User>('users', [{
      id: 'u1', nome: 'Administrador', email: 'admin@grupoast.com.br',
      senha: 'ast2024', perfil: 'admin', metaReais: 100000, comissao: 5,
      ativo: true, empresas: ['all'], cargo: 'Administrador', tel: '',
    }]);
  }
}
