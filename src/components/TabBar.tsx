import React from 'react';
import { colors, fonts } from '@/styles/theme';

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'inicio', icon: '☀', label: 'Início' },
  { id: 'aconselhar', icon: '✦', label: 'Aconselhar' },
  { id: 'plano', icon: '📖', label: 'Plano' },
  { id: 'comunidade', icon: '🕊', label: 'Comunidade' },
  { id: 'perfil', icon: '◎', label: 'Perfil' },
];

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 440, height: 64, zIndex: 100,
      background: colors.bgPrimary, borderTop: `0.5px solid ${colors.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            color: activeTab === t.id ? colors.gold : colors.textDim,
            padding: '4px 0',
          }}
        >
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontSize: 9, fontFamily: fonts.body }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
};

export default TabBar;
