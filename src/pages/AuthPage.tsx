import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { colors, fonts } from '@/styles/theme';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  background: colors.bgSurface,
  border: `0.5px solid ${colors.border}`,
  borderRadius: 10,
  color: colors.textPrimary,
  fontSize: 15,
  fontFamily: fonts.body,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnGold: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  background: colors.gold,
  color: colors.bgPrimary,
  border: 'none',
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 600,
  fontFamily: fonts.body,
  cursor: 'pointer',
  marginTop: 8,
};

const AuthPage: React.FC = () => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleSignup = async () => {
    setError('');
    setSuccess('');
    if (senha.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
    if (senha !== confirmSenha) { setError('As senhas não coincidem'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Verifique seu email para confirmar o cadastro');
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email) { setError('Digite seu email primeiro'); return; }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setSuccess('Email de recuperação enviado!');
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: `0.5px solid ${colors.border}`,
      }}>
        <span style={{ color: colors.gold, fontSize: 18, marginRight: 6 }}>✦</span>
        <span style={{ fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary }}>Carmelo</span>
      </div>

      <div style={{ flex: 1, padding: '32px 24px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setSuccess(''); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: fonts.body, fontSize: 15, paddingBottom: 8,
                color: tab === t ? colors.gold : colors.textDim,
                borderBottom: tab === t ? `2px solid ${colors.gold}` : '2px solid transparent',
              }}
            >
              {t === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input style={inputStyle} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <div style={{ position: 'relative' }}>
              <input style={inputStyle} placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} type={showPass ? 'text' : 'password'} />
              <button
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textDim, cursor: 'pointer', fontSize: 13 }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
            <button style={btnGold} onClick={handleLogin} disabled={loading}>
              {loading ? '...' : 'Entrar'}
            </button>
            <button
              onClick={handleForgot}
              style={{ background: 'none', border: 'none', color: colors.textDim, fontSize: 13, cursor: 'pointer', marginTop: 4, fontFamily: fonts.body }}
            >
              Esqueci minha senha
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input style={inputStyle} placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
            <input style={inputStyle} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <div style={{ position: 'relative' }}>
              <input style={inputStyle} placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} type={showPass ? 'text' : 'password'} />
              <button
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textDim, cursor: 'pointer', fontSize: 13 }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
            <input style={inputStyle} placeholder="Confirmar senha" value={confirmSenha} onChange={(e) => setConfirmSenha(e.target.value)} type="password" />
            <button style={btnGold} onClick={handleSignup} disabled={loading}>
              {loading ? '...' : 'Criar conta'}
            </button>
          </div>
        )}

        {error && <p style={{ color: colors.error, fontSize: 13, marginTop: 12, fontFamily: fonts.body }}>{error}</p>}
        {success && <p style={{ color: colors.success, fontSize: 13, marginTop: 12, fontFamily: fonts.body }}>{success}</p>}
      </div>
    </div>
  );
};

export default AuthPage;
