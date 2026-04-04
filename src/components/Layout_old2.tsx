import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { DB } from '@/lib/db';
import type { User } from '@/lib/types';

// No tipo de props do Layout:
headerExtra?: React.ReactNode;

// No JSX do header do Layout:
<div className="flex items-center gap-3">
  {headerExtra}
  {/* ...outros itens do header... */}
</div>

const PERFIL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  comercial: 'Comercial',
  prospectador: 'Prospectador',
  visualizador: 'Visualizador',
};

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const leadsNew = DB.get<{ status: string }>('leads').filter(l => l.status === 'novo').length;

  const initials = user?.nome
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const nav = (page: string) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length >= 2) {
      const lq = q.toLowerCase();
      const negs = DB.get<{ codigo: string; clienteNome: string; titulo: string }>('negociacoes');
      const found = negs.some(n =>
        n.codigo?.toLowerCase().includes(lq) ||
        n.clienteNome?.toLowerCase().includes(lq) ||
        n.titulo?.toLowerCase().includes(lq)
      );
      if (found) { nav('negociacoes'); setSearchQuery(''); }
    }
  };

  const isProspectador = user?.perfil === 'prospectador';
  const isAdmin = user?.perfil === 'admin';

  const NavItem = ({ page, icon, label, badge }: { page: string; icon: string; label: string; badge?: number }) => (
    <div
      onClick={() => nav(page)}
      className={`flex items-center gap-2.5 px-5 py-2.5 cursor-pointer text-[13px] border-l-[3px] transition-all ${
        currentPage === page
          ? 'bg-ast-bg3 text-foreground border-l-primary'
          : 'text-ast-text2 border-l-transparent hover:bg-ast-bg3 hover:text-foreground'
      }`}
    >
      <span className="text-[15px] w-[18px] text-center shrink-0">{icon}</span>
      {label}
      {badge && badge > 0 ? (
        <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1.5">
          {badge}
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center px-5 gap-4 z-50">
        <button
          className="flex flex-col items-center justify-center gap-[5px] w-9 h-9 lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span className="w-5 h-0.5 bg-ast-text2 rounded-sm" />
          <span className="w-5 h-0.5 bg-ast-text2 rounded-sm" />
          <span className="w-5 h-0.5 bg-ast-text2 rounded-sm" />
        </button>

        <div className="font-condensed text-[22px] font-black tracking-[3px] lg:w-60 shrink-0">
          GRUPO<span className="text-primary">AST</span>
        </div>

        <div className="flex-1 max-w-[420px] relative hidden sm:block">
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar negociação, cliente, código…"
            className="w-full bg-ast-bg3 border border-border rounded px-3 py-2 pl-9 text-foreground text-[13px] focus:outline-none focus:border-ast-border2"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ast-text3 text-base pointer-events-none">⌕</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-ast-text3 tracking-wider block">{PERFIL_LABELS[user?.perfil || ''] || ''}</span>
            <strong className="text-[13px] text-foreground font-semibold block">{user?.nome}</strong>
          </div>
          <div
            onClick={() => nav('config')}
            className="w-[34px] h-[34px] rounded-full bg-primary flex items-center justify-center text-[12px] font-bold text-primary-foreground cursor-pointer shrink-0"
          >
            {initials}
          </div>
          <button onClick={logout} className="text-ast-text3 hover:text-primary text-xs tracking-wider uppercase hidden sm:block">
            Sair
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <nav
        className={`fixed top-14 left-0 bottom-0 w-60 bg-card border-r border-border overflow-y-auto z-40 py-4 transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-60'
        }`}
      >
        <div className="text-[9px] text-ast-text3 tracking-[2px] uppercase px-5 pt-3.5 pb-1.5">Principal</div>
        <NavItem page="dashboard" icon="◈" label="Dashboard" />
        <NavItem page="pipeline" icon="◎" label="Pipeline" />

        <div className="text-[9px] text-ast-text3 tracking-[2px] uppercase px-5 pt-3.5 pb-1.5">Comercial</div>
        {!isProspectador && <NavItem page="negociacoes" icon="◇" label="Negociações" />}
        {!isProspectador && <NavItem page="recorrentes" icon="↻" label="Recorrentes" />}
        <NavItem page="leads" icon="◉" label="Leads" badge={leadsNew} />

        <div className="text-[9px] text-ast-text3 tracking-[2px] uppercase px-5 pt-3.5 pb-1.5">Cadastros</div>
        {!isProspectador && <NavItem page="clientes" icon="◐" label="Clientes" />}
        <NavItem page="parceiros" icon="◑" label="Parceiros" />
        {!isProspectador && <NavItem page="produtos" icon="▣" label="Produtos" />}
        {!isProspectador && <NavItem page="servicos" icon="▤" label="Serviços" />}
        {!isProspectador && <NavItem page="tarefas" icon="▤" label="Tarefas" />}
        {!isProspectador && <NavItem page="relatorios" icon="▤" label="Relatórios" />}
        <NavItem page="empresas" icon="⬡" label="Empresas" />

        {isAdmin && (
          <>
            <div className="text-[9px] text-ast-text3 tracking-[2px] uppercase px-5 pt-3.5 pb-1.5">Administração</div>
            <NavItem page="usuarios" icon="◎" label="Usuários" />
          </>
        )}

        <div className="text-[9px] text-ast-text3 tracking-[2px] uppercase px-5 pt-3.5 pb-1.5">Sistema</div>
        <NavItem page="config" icon="⚙" label="Configurações" />
      </nav>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MAIN */}
      <main className="pt-14 lg:ml-60 min-h-screen">
        <div className="p-4 sm:p-7">{children}</div>
      </main>
    </div>
  );
}
