import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { colors, fonts } from '@/styles/theme';

interface AppHeaderProps {
  onNavigatePerfil?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onNavigatePerfil }) => {
  const { profile } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initial = (profile?.nome || profile?.email || '?')[0].toUpperCase();

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 440, height: 64, zIndex: 100,
      background: colors.bgPrimary, borderBottom: `0.5px solid ${colors.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', boxSizing: 'border-box',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: colors.gold, fontSize: 16 }}>✦</span>
          <span style={{ fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary }}>Carmelo</span>
        </div>
        <div style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginTop: -2 }}>
          Conselheiro Bíblico
        </div>
      </div>

      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            width: 34, height: 34, borderRadius: '50%', background: colors.bgSurface,
            color: colors.gold, border: 'none', cursor: 'pointer',
            fontFamily: fonts.display, fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {initial}
        </button>

        {showDropdown && (
          <div style={{
            position: 'absolute', right: 0, top: 42, background: colors.bgSurface,
            border: `0.5px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden',
            minWidth: 160, zIndex: 200,
          }}>
            <button
              onClick={() => { setShowDropdown(false); onNavigatePerfil?.(); }}
              style={{
                display: 'block', width: '100%', padding: '12px 16px', background: 'none',
                border: 'none', color: colors.textPrimary, fontSize: 14, fontFamily: fonts.body,
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              Meu perfil
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); setShowDropdown(false); }}
              style={{
                display: 'block', width: '100%', padding: '12px 16px', background: 'none',
                border: 'none', color: colors.error, fontSize: 14, fontFamily: fonts.body,
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppHeader;
