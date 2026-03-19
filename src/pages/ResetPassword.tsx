import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { colors, fonts } from '@/styles/theme';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setError('');
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
    if (password !== confirm) { setError('As senhas não coincidem'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else setSuccess(true);
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', background: colors.bgSurface,
    border: `0.5px solid ${colors.border}`, borderRadius: 10, color: colors.textPrimary,
    fontSize: 15, fontFamily: fonts.body, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <h2 style={{ fontFamily: fonts.display, color: colors.textPrimary, marginBottom: 24 }}>Nova senha</h2>
      {success ? (
        <p style={{ color: colors.success, fontFamily: fonts.body }}>Senha atualizada com sucesso! Você já pode voltar ao app.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 360 }}>
          <input style={inputStyle} type="password" placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input style={inputStyle} type="password" placeholder="Confirmar nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button onClick={handleReset} disabled={loading} style={{ width: '100%', padding: 14, background: colors.gold, color: colors.bgPrimary, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? '...' : 'Atualizar senha'}
          </button>
          {error && <p style={{ color: colors.error, fontSize: 13 }}>{error}</p>}
        </div>
      )}
    </div>
  );
};

export default ResetPassword;
