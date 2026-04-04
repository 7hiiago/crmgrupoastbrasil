import React, { useState, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { initUsers } from '@/lib/seed';
import { seedDemoData } from '@/lib/seed';
import LoginScreen from '@/components/LoginScreen';
import Layout from '@/components/Layout';
import DashboardPage from '@/pages/DashboardPage';
import PipelinePage from '@/pages/PipelinePage';
import NegociacoesPage from '@/pages/NegociacoesPage';
import RecorrentesPage from '@/pages/RecorrentesPage';
import LeadsPage from '@/pages/LeadsPage';
import ClientesPage from '@/pages/ClientesPage';
import ParceirosPage from '@/pages/ParceirosPage';
import ProdutosPage from '@/pages/ProdutosPage';
import ServicosPage from '@/pages/ServicosPage';
import EmpresasPage from '@/pages/EmpresasPage';
import UsuariosPage from '@/pages/UsuariosPage';
import ConfigPage from '@/pages/ConfigPage';
import TarefasPage, { NotificationBell, NotificationPanel } from '@/pages/TarefasPage';
import RelatoriosPage from '@/pages/RelatoriosPage';
import PropostaPage from '@/pages/PropostaPage';


// Initialize
initUsers();
seedDemoData();

function CRMApp() {
  const { user } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notification panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return <LoginScreen />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard':   return <DashboardPage onNavigate={setPage} />;
      case 'pipeline':    return <PipelinePage onNewNeg={() => setPage('negociacoes')} onEditNeg={() => setPage('negociacoes')} />;
      case 'negociacoes': return <NegociacoesPage onNavigate={setPage} />;
      case 'proposta':    return <PropostaPage onBack={() => setPage('negociacoes')} />;
      case 'recorrentes': return <RecorrentesPage />;
      case 'leads':       return <LeadsPage />;
      case 'clientes':    return <ClientesPage />;
      case 'parceiros':   return <ParceirosPage />;
      case 'produtos':    return <ProdutosPage />;
      case 'servicos':    return <ServicosPage />;
      case 'empresas':    return <EmpresasPage />;
      case 'usuarios':    return <UsuariosPage />;
      case 'config':      return <ConfigPage />;
      case 'tarefas':     return <TarefasPage />;
      case 'relatorios':  return <RelatoriosPage />;
      case 'proposta':    return <PropostaPage negociacaoId={currentNegId} onBack={() => navigate('negociacoes')} />;
      default:            return <DashboardPage onNavigate={setPage} />;
    }
  };

  return (
    <Layout
      currentPage={page}
      onNavigate={setPage}
      // Passar o sino de notificações para o Layout renderizar no header
      headerExtra={
        <div ref={notifRef} className="relative">
          <NotificationBell onClick={() => setNotifOpen(o => !o)} />
          {notifOpen && (
            <NotificationPanel
              onNavigate={(p) => { setPage(p); setNotifOpen(false); }}
            />
          )}
        </div>
      }
    >
      {renderPage()}
    </Layout>
  );
}

export default function Index() {
  return (
    <AuthProvider>
      <CRMApp />
    </AuthProvider>
  );
}
