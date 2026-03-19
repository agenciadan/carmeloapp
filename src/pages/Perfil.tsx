import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fonts } from '@/styles/theme';

interface PerfilProps {
  onBack?: () => void;
}

const Perfil: React.FC<PerfilProps> = ({ onBack }) => {
  const { profile } = useAuth();

  if (!profile) return null;

  return (
    <div style={{ padding: '24px 20px' }}>
      {onBack && (
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 14, marginBottom: 24, fontFamily: fonts.body }}>
          ← Voltar
        </button>
      )}

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: colors.bgSurface,
          color: colors.gold, fontSize: 24, fontFamily: fonts.display, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
        }}>
          {(profile.nome || profile.email || '?')[0].toUpperCase()}
        </div>
        <h2 style={{ fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, margin: 0 }}>{profile.nome || '—'}</h2>
        <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>{profile.email}</p>
      </div>

      <div style={{ background: colors.bgSurface, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: colors.textDim }}>Membro desde</span>
          <span style={{ fontSize: 13, color: colors.textPrimary }}>{new Date(profile.criado_em).toLocaleDateString('pt-BR')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: colors.textDim }}>Último acesso</span>
          <span style={{ fontSize: 13, color: colors.textPrimary }}>{profile.ultimo_acesso ? new Date(profile.ultimo_acesso).toLocaleDateString('pt-BR') : '—'}</span>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
