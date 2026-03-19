import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { colors, fonts, appContainer, globalScrollbarCSS } from '@/styles/theme';
import AppHeader from '@/components/AppHeader';
import TabBar from '@/components/TabBar';
import VersiculoDoDia from '@/pages/VersiculoDoDia';
import Aconselhamento from '@/pages/Aconselhamento';
import Historico from '@/pages/Historico';
import Perfil from '@/pages/Perfil';
import SplashScreen from '@/pages/SplashScreen';
import AuthPage from '@/pages/AuthPage';

const Index: React.FC = () => {
  const { session, profile, isAdmin, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [showPerfil, setShowPerfil] = useState(false);
  const [maintenance, setMaintenance] = useState<{ active: boolean; message: string }>({ active: false, message: '' });

  // Check maintenance
  useEffect(() => {
    if (!session) return;
    const checkMaintenance = async () => {
      const { data } = await supabase.from('configuracoes').select('app_em_manutencao, mensagem_manutencao').eq('id', 1).single();
      if (data) {
        setMaintenance({ active: data.app_em_manutencao, message: data.mensagem_manutencao || '' });
      }
    };
    checkMaintenance();
  }, [session]);

  if (isLoading && !showSplash) {
    return <div style={{ ...appContainer, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{globalScrollbarCSS}</style>
      <span style={{ color: colors.textMuted }}>Carregando...</span>
    </div>;
  }

  if (showSplash) {
    return (
      <>
        <style>{globalScrollbarCSS}</style>
        <SplashScreen onStart={() => setShowSplash(false)} />
      </>
    );
  }

  if (!session) {
    return (
      <div style={appContainer}>
        <style>{globalScrollbarCSS}</style>
        <AuthPage />
      </div>
    );
  }

  // Maintenance mode for non-admin
  if (maintenance.active && !isAdmin) {
    return (
      <div style={{ ...appContainer, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <style>{globalScrollbarCSS}</style>
        <span style={{ fontSize: 40, color: colors.gold, marginBottom: 20 }}>✦</span>
        <h2 style={{ fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, textAlign: 'center' }}>Em manutenção</h2>
        <p style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 1.7 }}>
          {maintenance.message || 'O app está temporariamente indisponível. Voltaremos em breve.'}
        </p>
      </div>
    );
  }

  // Check if user is inactive
  if (profile && !profile.ativo) {
    return (
      <div style={{ ...appContainer, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <style>{globalScrollbarCSS}</style>
        <h2 style={{ fontFamily: fonts.display, fontSize: 22, color: colors.error, textAlign: 'center' }}>Conta desativada</h2>
        <p style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 12 }}>
          Sua conta foi desativada. Entre em contato com o suporte.
        </p>
        <button onClick={() => supabase.auth.signOut()} style={{ marginTop: 24, padding: '12px 24px', background: colors.bgSurface, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMuted, cursor: 'pointer' }}>
          Sair
        </button>
      </div>
    );
  }

  const renderTab = () => {
    if (showPerfil) return <Perfil onBack={() => setShowPerfil(false)} />;
    switch (activeTab) {
      case 'inicio': return <VersiculoDoDia />;
      case 'aconselhar': return <Aconselhamento />;
      case 'historico': return <Historico />;
      default: return <VersiculoDoDia />;
    }
  };

  return (
    <div style={appContainer}>
      <style>{globalScrollbarCSS}</style>
      <AppHeader onNavigatePerfil={() => setShowPerfil(true)} />
      <div style={{ paddingTop: 64, paddingBottom: 72, minHeight: '100vh', boxSizing: 'border-box' }}>
        {renderTab()}
      </div>
      <TabBar activeTab={activeTab} onTabChange={(tab) => { setShowPerfil(false); setActiveTab(tab); }} />
    </div>
  );
};

export default Index;
