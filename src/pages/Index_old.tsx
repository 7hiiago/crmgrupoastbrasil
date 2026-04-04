import React, { useState, useEffect } from 'react';
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

// Initialize
initUsers();
seedDemoData();

function CRMApp() {
  const { user } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (!user) return <LoginScreen />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage onNavigate={setPage} />;
      case 'pipeline': return <PipelinePage onNewNeg={() => setPage('negociacoes')} onEditNeg={() => setPage('negociacoes')} />;
      case 'negociacoes': return <NegociacoesPage />;
      case 'recorrentes': return <RecorrentesPage />;
      case 'leads': return <LeadsPage />;
      case 'clientes': return <ClientesPage />;
      case 'parceiros': return <ParceirosPage />;
      case 'produtos': return <ProdutosPage />;
      case 'servicos': return <ServicosPage />;
      case 'empresas': return <EmpresasPage />;
      case 'usuarios': return <UsuariosPage />;
      case 'config': return <ConfigPage />;
      default: return <DashboardPage onNavigate={setPage} />;
    }
  };

  return (
    <Layout currentPage={page} onNavigate={setPage}>
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
