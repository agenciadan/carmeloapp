import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { colors, fonts } from '@/styles/theme';

interface PerfilProps {
  onNavigateTab?: (tab: string) => void;
}

interface Conquista {
  tipo: string;
  emoji: string;
  titulo: string;
  desbloqueada: boolean;
  conquistado_em?: string;
}

interface HistoricoItem {
  id: string;
  tipo: string;
  data_formatada: string | null;
  referencia: string | null;
  texto_preview: string | null;
  dados_completos: any;
  criado_em: string;
}

const ALL_CONQUISTAS = [
  { tipo: 'primeira_chama', emoji: '🔥', titulo: 'Primeira Chama' },
  { tipo: 'buscador', emoji: '📖', titulo: 'Buscador' },
  { tipo: 'em_oracao', emoji: '🙏', titulo: 'Em Oração' },
  { tipo: 'tres_dias', emoji: '💎', titulo: '3 Dias' },
  { tipo: 'semana_fiel', emoji: '⭐', titulo: 'Semana Fiel' },
  { tipo: 'duas_semanas', emoji: '🌙', titulo: 'Duas Semanas' },
  { tipo: 'um_mes', emoji: '👑', titulo: 'Um Mês' },
  { tipo: 'dois_meses', emoji: '🔱', titulo: 'Dois Meses' },
  { tipo: 'centenario', emoji: '✨', titulo: 'Centenário' },
  { tipo: 'estudioso', emoji: '📚', titulo: 'Estudioso' },
  { tipo: 'raizes_profundas', emoji: '🌿', titulo: 'Raízes Profundas' },
  { tipo: 'monte_carmelo', emoji: '🏔️', titulo: 'Monte Carmelo' },
];

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const unique = [...new Set(dates.map(d => new Date(d).toISOString().slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let expected = today;
  for (const d of unique) {
    if (d === expected) {
      streak++;
      const prev = new Date(expected);
      prev.setDate(prev.getDate() - 1);
      expected = prev.toISOString().slice(0, 10);
    } else if (d < expected) {
      break;
    }
  }
  return streak;
}

function daysBetween(a: string, b: Date): number {
  return Math.floor((b.getTime() - new Date(a).getTime()) / 86400000);
}

const Perfil: React.FC<PerfilProps> = ({ onNavigateTab }) => {
  const { session, profile, refreshProfile } = useAuth();
  const [totalItems, setTotalItems] = useState(0);
  const [streak, setStreak] = useState(0);
  const [diasJornada, setDiasJornada] = useState(0);
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [filtro, setFiltro] = useState('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [igreja, setIgreja] = useState('');
  const [showIgrejaModal, setShowIgrejaModal] = useState(false);
  const [igrejaInput, setIgrejaInput] = useState('');
  const [showConquistasModal, setShowConquistasModal] = useState(false);
  const [toasts, setToasts] = useState<{ emoji: string; titulo: string; key: number }[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [versiculoCount, setVersiculoCount] = useState(0);
  const [aconselhamentoCount, setAconselhamentoCount] = useState(0);

  const conquistasSectionRef = useRef<HTMLDivElement>(null);
  const atividadeSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastKeyRef = useRef(0);

  const userId = session?.user?.id;

  const loadData = useCallback(async () => {
    if (!userId || !profile) return;

    setIgreja((profile as any).igreja || '');
    setAvatarUrl((profile as any).avatar_url || null);
    setDiasJornada(daysBetween(profile.criado_em, new Date()));

    // Fetch historico
    const { data: hist } = await supabase
      .from('historico')
      .select('*')
      .eq('user_id', userId)
      .order('criado_em', { ascending: false });

    const items = (hist || []) as HistoricoItem[];
    setHistorico(items);
    setTotalItems(items.length);

    const vc = items.filter(i => i.tipo === 'versiculo').length;
    const ac = items.filter(i => i.tipo === 'aconselhamento').length;
    setVersiculoCount(vc);
    setAconselhamentoCount(ac);

    // Calc streak
    const dates = items.map(i => i.criado_em);
    const s = calcStreak(dates);
    setStreak(s);

    // Fetch existing conquistas
    const { data: existing } = await supabase
      .from('conquistas_usuario')
      .select('tipo')
      .eq('user_id', userId);
    const existingTipos = new Set((existing || []).map((c: any) => c.tipo));

    // Check new conquistas
    const dj = daysBetween(profile.criado_em, new Date());
    const rules: Record<string, boolean> = {
      primeira_chama: vc >= 1,
      buscador: vc >= 7,
      em_oracao: ac >= 1,
      tres_dias: s >= 3,
      semana_fiel: s >= 7,
      duas_semanas: s >= 14,
      um_mes: s >= 30,
      dois_meses: s >= 60,
      centenario: s >= 100,
      estudioso: ac >= 5,
      raizes_profundas: vc >= 30,
      monte_carmelo: dj >= 100,
    };

    const newlyUnlocked: { emoji: string; titulo: string }[] = [];
    for (const c of ALL_CONQUISTAS) {
      if (rules[c.tipo] && !existingTipos.has(c.tipo)) {
        await supabase.from('conquistas_usuario').insert({
          user_id: userId,
          tipo: c.tipo,
          titulo: c.titulo,
          emoji: c.emoji,
        });
        existingTipos.add(c.tipo);
        newlyUnlocked.push({ emoji: c.emoji, titulo: c.titulo });
      }
    }

    setConquistas(
      ALL_CONQUISTAS.map(c => ({
        ...c,
        desbloqueada: existingTipos.has(c.tipo),
      }))
    );

    // Show toasts for new conquistas
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach((c, i) => {
        setTimeout(() => {
          const key = ++toastKeyRef.current;
          setToasts(prev => [...prev, { ...c, key }]);
          setTimeout(() => setToasts(prev => prev.filter(t => t.key !== key)), 3300);
        }, i * 3500);
      });
    }
  }, [userId, profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const path = `${userId}/avatar.jpg`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (error) { console.error(error); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = urlData.publicUrl + '?t=' + Date.now();
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
    setAvatarUrl(url);
    refreshProfile();
  };

  const handleSaveIgreja = async () => {
    if (!userId) return;
    await supabase.from('profiles').update({ igreja: igrejaInput }).eq('id', userId);
    setIgreja(igrejaInput);
    setShowIgrejaModal(false);
    refreshProfile();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este item do histórico?')) return;
    await supabase.from('historico').delete().eq('id', id);
    setHistorico(prev => prev.filter(h => h.id !== id));
    setTotalItems(prev => prev - 1);
  };

  const nextMilestone = STREAK_MILESTONES.find(m => m > streak) || 100;
  const prevMilestone = STREAK_MILESTONES.filter(m => m <= streak).pop() || 0;
  const progressPct = ((streak - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  const filteredHistorico = filtro === 'todos'
    ? historico
    : historico.filter(h => {
        if (filtro === 'versiculos') return h.tipo === 'versiculo';
        if (filtro === 'conselhos') return h.tipo === 'aconselhamento';
        if (filtro === 'planos') return h.tipo === 'plano';
        return true;
      });

  const unlockedCount = conquistas.filter(c => c.desbloqueada).length;

  if (!profile) return null;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return d; }
  };

  const badgeStyle = (tipo: string): React.CSSProperties => {
    if (tipo === 'versiculo') return { color: colors.gold, border: `0.5px solid ${colors.goldDim}`, fontSize: 10, padding: '2px 10px', borderRadius: 20 };
    if (tipo === 'aconselhamento') return { color: colors.textMuted, border: `0.5px solid ${colors.border}`, fontSize: 10, padding: '2px 10px', borderRadius: 20 };
    return { color: colors.success, border: '0.5px solid #0F2A1A', fontSize: 10, padding: '2px 10px', borderRadius: 20 };
  };

  const badgeLabel = (tipo: string) => {
    if (tipo === 'versiculo') return 'Versículo';
    if (tipo === 'aconselhamento') return 'Conselho';
    return 'Plano';
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* TOASTS */}
      {toasts.map((t, i) => (
        <div key={t.key} style={{
          position: 'fixed', top: 80 + i * 70, left: 24, right: 24, zIndex: 9999,
          background: colors.bgSurface, border: `0.5px solid ${colors.gold}`, borderRadius: 14,
          padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12,
          animation: 'toastIn 0.3s ease forwards',
        }}>
          <span style={{ fontSize: 28 }}>{t.emoji}</span>
          <div>
            <div style={{ fontSize: 14, color: colors.gold, fontWeight: 500 }}>Conquista desbloqueada!</div>
            <div style={{ fontSize: 13, color: colors.textMuted }}>{t.titulo}</div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes toastIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* SEÇÃO 1 — Cabeçalho */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, fontWeight: 500 }}>
              {profile.nome || '—'}
            </div>
            <div style={{ fontSize: 13, color: colors.textDim, marginTop: 4 }}>{profile.email}</div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: colors.bgSurface,
              border: `2px solid ${colors.border}`, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: fonts.display, fontSize: 28, color: colors.gold }}>
                  {(profile.nome || profile.email || '?')[0].toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute', bottom: -2, right: -2, width: 26, height: 26,
                borderRadius: '50%', background: colors.gold, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <div style={{ border: `0.5px solid ${colors.border}`, borderRadius: 20, padding: '7px 16px', background: colors.bgSurface, display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: colors.gold, fontWeight: 500 }}>{diasJornada}</span>
            <span style={{ fontSize: 13, color: colors.textMuted }}>dias de jornada</span>
          </div>
          <div style={{ border: `0.5px solid ${colors.border}`, borderRadius: 20, padding: '7px 16px', background: colors.bgSurface, display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: colors.gold, fontWeight: 500 }}>{totalItems}</span>
            <span style={{ fontSize: 13, color: colors.textMuted }}>itens salvos</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2 — Igreja */}
      <div style={{ marginTop: 20, margin: '20px 24px 0' }}>
        {!igreja ? (
          <div
            onClick={() => { setIgrejaInput(''); setShowIgrejaModal(true); }}
            style={{
              background: colors.bgSurface, border: `0.5px dashed ${colors.border}`, borderRadius: 14,
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 20, color: colors.textDim }}>⛪</span>
            <span style={{ fontSize: 14, color: colors.textDim }}>Adicionar sua igreja</span>
          </div>
        ) : (
          <div style={{
            background: colors.bgSurface, border: `0.5px solid ${colors.border}`, borderRadius: 14,
            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, color: colors.gold }}>⛪</span>
              <span style={{ fontSize: 14, color: colors.textPrimary }}>{igreja}</span>
            </div>
            <span onClick={() => { setIgrejaInput(igreja); setShowIgrejaModal(true); }} style={{ fontSize: 12, color: colors.textDim, cursor: 'pointer' }}>Editar</span>
          </div>
        )}
      </div>

      {/* Igreja Modal */}
      {showIgrejaModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowIgrejaModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: colors.bgPrimary, border: `0.5px solid ${colors.border}`, borderRadius: 20,
            padding: 24, width: '85%', maxWidth: 360,
          }}>
            <div style={{ fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, marginBottom: 16 }}>Sua Igreja</div>
            <input
              value={igrejaInput}
              onChange={e => setIgrejaInput(e.target.value)}
              placeholder="Nome da sua igreja..."
              style={{
                width: '100%', background: colors.bgSurface, border: `0.5px solid ${colors.border}`,
                borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 14,
                fontFamily: fonts.body, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleSaveIgreja}
              style={{
                marginTop: 14, width: '100%', padding: 14, background: colors.gold,
                color: colors.bgPrimary, border: 'none', borderRadius: 12, fontSize: 14,
                fontWeight: 500, cursor: 'pointer',
              }}
            >Salvar</button>
          </div>
        </div>
      )}

      {/* SEÇÃO 3 — Ações rápidas */}
      <div style={{ marginTop: 20, margin: '20px 24px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { icon: '📜', label: 'Histórico', action: () => atividadeSectionRef.current?.scrollIntoView({ behavior: 'smooth' }) },
          { icon: '🏆', label: 'Conquistas', action: () => conquistasSectionRef.current?.scrollIntoView({ behavior: 'smooth' }) },
          { icon: '📖', label: 'Plano atual', action: () => onNavigateTab?.('plano') },
        ].map((a, i) => (
          <div key={i} onClick={a.action} style={{
            background: colors.bgSurface, border: `0.5px solid ${colors.border}`, borderRadius: 14,
            padding: '16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
          }}>
            <span style={{ fontSize: 22, marginBottom: 8 }}>{a.icon}</span>
            <span style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>{a.label}</span>
          </div>
        ))}
      </div>

      {/* SEÇÃO 4 — Streak */}
      <div style={{ marginTop: 20, margin: '20px 24px 0' }}>
        <div style={{
          background: colors.bgSurface, border: `0.5px solid ${colors.border}`, borderRadius: 14, padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: fonts.display, fontSize: 48, color: colors.gold, lineHeight: 1 }}>{streak}</div>
              <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Perseverança na Jornada</div>
            </div>
            <span style={{ fontSize: 32 }}>🔥</span>
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 8 }}>
              {streak >= 100 ? 'Meta máxima alcançada!' : `${nextMilestone - streak} dias para ${nextMilestone} dias`}
            </div>
            <div style={{ background: colors.border, height: 5, borderRadius: 3, width: '100%' }}>
              <div style={{
                background: colors.gold, height: '100%', borderRadius: 3,
                width: `${Math.min(progressPct, 100)}%`, transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 5 — Conquistas */}
      <div ref={conquistasSectionRef} style={{ marginTop: 20, margin: '20px 24px 0' }}>
        <div style={{
          background: colors.bgSurface, border: `0.5px solid ${colors.border}`, borderRadius: 14, padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: fonts.display, fontSize: 32, color: colors.gold }}>{unlockedCount}</div>
              <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>Conquistas</div>
            </div>
            <span style={{ fontSize: 28 }}>🏅</span>
          </div>
          <p style={{ marginTop: 14, marginBottom: 18, fontSize: 14, color: colors.textDim, textAlign: 'center', lineHeight: 1.7 }}>
            Ganhe conquistas usando o versículo do dia, recebendo conselhos bíblicos e completando planos de leitura.
          </p>
          <button
            onClick={() => setShowConquistasModal(true)}
            style={{
              border: `0.5px solid ${colors.gold}`, color: colors.gold, background: 'transparent',
              borderRadius: 10, padding: 12, width: '100%', fontSize: 14, cursor: 'pointer',
            }}
          >Ver todas as conquistas</button>
        </div>
      </div>

      {/* Conquistas Modal */}
      {showConquistasModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowConquistasModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: colors.bgPrimary, border: `0.5px solid ${colors.border}`, borderRadius: 20,
            padding: 24, width: '85%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto',
            position: 'relative',
          }}>
            <button onClick={() => setShowConquistasModal(false)} style={{
              position: 'absolute', top: 16, right: 18, background: 'none', border: 'none',
              color: colors.textDim, fontSize: 20, cursor: 'pointer',
            }}>×</button>
            <div style={{ fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, marginBottom: 20 }}>Conquistas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {conquistas.map(c => (
                <div key={c.tipo} style={{
                  padding: 12, borderRadius: 12, textAlign: 'center',
                  background: c.desbloqueada ? colors.bgHover : colors.bgSurface,
                  border: `0.5px solid ${c.desbloqueada ? colors.gold : colors.border}`,
                }}>
                  <span style={{ fontSize: 28, filter: c.desbloqueada ? 'none' : 'grayscale(1)', opacity: c.desbloqueada ? 1 : 0.4 }}>{c.emoji}</span>
                  <div style={{ fontSize: 10, color: c.desbloqueada ? colors.textPrimary : colors.textDim, marginTop: 6, lineHeight: 1.3 }}>{c.titulo}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 6 — Atividade */}
      <div ref={atividadeSectionRef} style={{ marginTop: 24, padding: '0 24px' }}>
        <div style={{ fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, marginBottom: 16 }}>Atividade</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'versiculos', label: 'Versículos' },
            { id: 'conselhos', label: 'Conselhos' },
            { id: 'planos', label: 'Planos' },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)} style={{
              background: filtro === f.id ? colors.gold : colors.bgSurface,
              color: filtro === f.id ? colors.bgPrimary : colors.textMuted,
              border: filtro === f.id ? 'none' : `0.5px solid ${colors.border}`,
              borderRadius: 20, padding: '7px 16px', fontSize: 13, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{f.label}</button>
          ))}
        </div>

        {filteredHistorico.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, color: colors.gold, opacity: 0.15, marginBottom: 16 }}>✦</div>
            <div style={{ fontFamily: fonts.display, fontSize: 20, color: colors.textDim }}>Sua jornada começa aqui.</div>
            <div style={{ fontSize: 13, color: '#2A3F52', marginTop: 8 }}>
              Use o versículo do dia e o aconselhamento para construir seu histórico.
            </div>
          </div>
        ) : (
          filteredHistorico.map(item => {
            const expanded = expandedId === item.id;
            return (
              <div key={item.id} onClick={() => setExpandedId(expanded ? null : item.id)} style={{
                background: colors.bgSurface, border: `0.5px solid ${colors.border}`, borderRadius: 14,
                padding: 18, marginBottom: 12, cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: colors.textDim }}>{formatDate(item.criado_em)}</span>
                  <span style={badgeStyle(item.tipo)}>{badgeLabel(item.tipo)}</span>
                </div>
                {item.referencia && (
                  <div style={{ fontFamily: fonts.display, fontSize: 15, color: colors.gold, marginTop: 10 }}>{item.referencia}</div>
                )}
                <div style={{
                  fontSize: 13, color: colors.textMuted, lineHeight: 1.6, marginTop: 4,
                  ...(!expanded ? { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any } : {}),
                }}>
                  {item.texto_preview}
                </div>
                {expanded && item.dados_completos && (
                  <div style={{ marginTop: 12, fontSize: 13, color: colors.textMuted, lineHeight: 1.7 }}>
                    {typeof item.dados_completos === 'object' && (item.dados_completos as any).aplicacao && (
                      <p style={{ fontStyle: 'italic', color: '#9BAFC0' }}>{(item.dados_completos as any).aplicacao}</p>
                    )}
                    {typeof item.dados_completos === 'object' && (item.dados_completos as any).reflexao && (
                      <p style={{ fontStyle: 'italic', color: '#9BAFC0' }}>{(item.dados_completos as any).reflexao}</p>
                    )}
                  </div>
                )}
                {expanded && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                    style={{ marginTop: 12, fontSize: 13, color: colors.error, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >Excluir</button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SEÇÃO 7 — Rodapé */}
      <div style={{ padding: '32px 24px', marginTop: 16, borderTop: `0.5px solid ${colors.border}` }}>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            background: 'transparent', border: 'none', color: colors.textDim, fontSize: 13,
            width: '100%', padding: 12, cursor: 'pointer', textAlign: 'center',
          }}
        >Sair da conta</button>
        <div style={{ fontSize: 11, color: '#2A3F52', textAlign: 'center', marginTop: 8 }}>Carmelo v1.0</div>
      </div>
    </div>
  );
};

export default Perfil;
