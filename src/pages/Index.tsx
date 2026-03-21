import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { colors, fonts, appContainer, globalScrollbarCSS } from '@/styles/theme';
import AppHeader from '@/components/AppHeader';
import TabBar from '@/components/TabBar';
import VersiculoDoDia from '@/pages/VersiculoDoDia';
import PlanoLeitura from '@/pages/PlanoLeitura';
import Aconselhamento from '@/pages/Aconselhamento';
import Perfil from '@/pages/Perfil';
import Comunidade from '@/pages/Comunidade';
import SplashScreen from '@/pages/SplashScreen';
import AuthPage from '@/pages/AuthPage';

const PlaceholderTab: React.FC<{ title: string; emoji: string }> = ({ title, emoji }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 40 }}>
    <span style={{ fontSize: 48, marginBottom: 16 }}>{emoji}</span>
    <h2 style={{ fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, textAlign: 'center' }}>{title}</h2>
    <p style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>Em breve</p>
  </div>
);

const Index: React.FC = () => {
  const { session, profile, isAdmin, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [maintenance, setMaintenance] = useState<{ active: boolean; message: string }>({ active: false, message: '' });
  const [streak, setStreak] = useState(0);

  const fetchStreak = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('historico').select('criado_em').eq('user_id', session.user.id);
    if (data) {
      const dates = data.map(d => d.criado_em);
      const unique = [...new Set(dates.map(d => d.split('T')[0]))].sort().reverse();
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (unique[0] !== today && unique[0] !== yesterday) { setStreak(0); return; }
      let s = 1;
      for (let i = 1; i < unique.length; i++) {
        const prev = new Date(unique[i - 1]);
        const curr = new Date(unique[i]);
        if ((prev.getTime() - curr.getTime()) / 86400000 === 1) s++;
        else break;
      }
      setStreak(s);
    }
  }, [session?.user?.id]);

  useEffect(() => { fetchStreak(); }, [fetchStreak]);

  useEffect(() => {
    if (!session) return;
    const checkMaintenance = async () => {
      const { data } = await supabase.from('configuracoes').select('app_em_manutencao, mensagem_manutencao').eq('id', 1).single();
      if (data) setMaintenance({ active: data.app_em_manutencao, message: data.mensagem_manutencao || '' });
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

  const showHeader = activeTab !== 'perfil';

  const renderTab = () => {
    switch (activeTab) {
      case 'inicio': return <VersiculoDoDia onNavigateTab={(tab) => setActiveTab(tab)} />;
      case 'aconselhar': return <Aconselhamento />;
      case 'plano': return <PlanoLeitura />;
      case 'comunidade': return <PlaceholderTab title="Comunidade" emoji="🕊" />;
      case 'perfil': return <Perfil onNavigateTab={(tab) => setActiveTab(tab)} />;
      default: return <VersiculoDoDia onNavigateTab={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div style={appContainer}>
      <style>{globalScrollbarCSS}</style>
      {showHeader && <AppHeader onNavigatePerfil={() => setActiveTab('perfil')} streak={streak} />}
      <div style={{ paddingTop: showHeader ? 64 : 0, paddingBottom: 72, minHeight: '100vh', boxSizing: 'border-box' }}>
        {renderTab()}
      </div>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
