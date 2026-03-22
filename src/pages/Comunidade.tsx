import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fonts } from '@/styles/theme';

interface Post {
  id: string;
  user_id: string;
  tipo: string;
  conteudo: string;
  referencia_biblica: string | null;
  nome_usuario: string;
  criado_em: string;
  reacoes: { orando: number; amei: number; gratidao: number };
  minhasReacoes: { orando: boolean; amei: boolean; gratidao: boolean };
}

interface ComunidadeProps {
  onNavigateTab?: (tab: string) => void;
  initialTab?: 'feed' | 'compartilhar';
}

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
};

const tipoBadge = (tipo: string) => {
  const map: Record<string, { label: string; color: string; border: string; bg: string }> = {
    versiculo: { label: 'Versículo', color: colors.gold, border: colors.goldDim, bg: '#1A1000' },
    reflexao: { label: 'Reflexão', color: colors.textMuted, border: colors.border, bg: colors.bgSurface },
    oracao: { label: 'Oração', color: '#9BAFC0', border: colors.border, bg: colors.bgSurface },
    plano: { label: 'Plano', color: colors.success, border: '#0F2A1A', bg: '#091A0E' },
  };
  return map[tipo] || map.reflexao;
};

const Comunidade: React.FC<ComunidadeProps> = ({ onNavigateTab, initialTab }) => {
  const { session, profile } = useAuth();
  const userId = session?.user?.id;

  const [tab, setTab] = useState<'feed' | 'compartilhar'>(initialTab || 'feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');

  // Compartilhar state
  const [tipoPost, setTipoPost] = useState<'versiculo' | 'reflexao' | 'oracao' | 'plano'>('reflexao');
  const [conteudo, setConteudo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Plano ativo
  const [planoAtivo, setPlanoAtivo] = useState<any>(null);
  const [planoProgresso, setPlanoProgresso] = useState({ concluidos: 0, total: 0 });

  // Versículo do dia
  const versiculoHoje = userId ? (() => {
    try {
      const c = localStorage.getItem(`carmelo:versiculoHoje:${userId}`);
      if (!c) return null;
      const p = JSON.parse(c);
      if (p.date === new Date().toISOString().split('T')[0]) return p.data;
      return null;
    } catch { return null; }
  })() : null;

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data: postsData } = await supabase
      .from('posts_comunidade')
      .select('*')
      .eq('visivel', true)
      .order('criado_em', { ascending: false })
      .limit(30);

    if (!postsData) { setLoading(false); return; }

    const postIds = postsData.map(p => p.id);
    const { data: reacoesData } = await supabase
      .from('reacoes_posts')
      .select('*')
      .in('post_id', postIds);

    const reacoes = reacoesData || [];

    const mapped: Post[] = postsData.map(p => {
      const postReacoes = reacoes.filter(r => r.post_id === p.id);
      return {
        ...p,
        reacoes: {
          orando: postReacoes.filter(r => r.tipo === 'orando').length,
          amei: postReacoes.filter(r => r.tipo === 'amei').length,
          gratidao: postReacoes.filter(r => r.tipo === 'gratidao').length,
        },
        minhasReacoes: {
          orando: postReacoes.some(r => r.tipo === 'orando' && r.user_id === userId),
          amei: postReacoes.some(r => r.tipo === 'amei' && r.user_id === userId),
          gratidao: postReacoes.some(r => r.tipo === 'gratidao' && r.user_id === userId),
        },
      };
    });

    setPosts(mapped);
    setLoading(false);
  }, [userId]);

  const fetchPlano = useCallback(async () => {
    if (!userId) return;
    const { data: planos } = await supabase
      .from('planos_leitura')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ativo')
      .limit(1);
    if (planos && planos.length > 0) {
      setPlanoAtivo(planos[0]);
      const { data: dias } = await supabase
        .from('dias_leitura')
        .select('concluido')
        .eq('plano_id', planos[0].id);
      if (dias) {
        setPlanoProgresso({
          concluidos: dias.filter(d => d.concluido).length,
          total: dias.length,
        });
      }
    }
  }, [userId]);

  useEffect(() => { fetchPosts(); fetchPlano(); }, [fetchPosts, fetchPlano]);

  const toggleReacao = async (postId: string, tipo: 'orando' | 'amei' | 'gratidao') => {
    if (!userId) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const jaReagiu = post.minhasReacoes[tipo];

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        reacoes: { ...p.reacoes, [tipo]: p.reacoes[tipo] + (jaReagiu ? -1 : 1) },
        minhasReacoes: { ...p.minhasReacoes, [tipo]: !jaReagiu },
      };
    }));

    if (jaReagiu) {
      await supabase.from('reacoes_posts').delete()
        .eq('post_id', postId).eq('user_id', userId).eq('tipo', tipo);
    } else {
      await supabase.from('reacoes_posts').insert({ post_id: postId, user_id: userId, tipo });
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Excluir este post?')) return;
    await supabase.from('posts_comunidade').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const publicar = async () => {
    if (!userId || !profile) return;
    setPublishing(true);

    let finalConteudo = conteudo;
    let finalRef = referencia || null;

    if (tipoPost === 'versiculo' && versiculoHoje) {
      finalConteudo = conteudo ? `${versiculoHoje.texto}\n\n${conteudo}` : versiculoHoje.texto;
      finalRef = versiculoHoje.referencia;
    }

    if (tipoPost === 'plano' && planoAtivo) {
      finalConteudo = planoAtivo.descricao;
      finalRef = planoAtivo.titulo;
    }

    if (!finalConteudo.trim()) { setPublishing(false); return; }

    await supabase.from('posts_comunidade').insert({
      user_id: userId,
      tipo: tipoPost === 'versiculo' ? 'versiculo' : tipoPost,
      conteudo: finalConteudo,
      referencia_biblica: finalRef,
      nome_usuario: profile.nome || 'Anônimo',
    });

    setConteudo('');
    setReferencia('');
    setPublishing(false);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
    setTab('feed');
    fetchPosts();
  };

  const filteredPosts = filtro === 'todos' ? posts : posts.filter(p => {
    if (filtro === 'versiculos') return p.tipo === 'versiculo';
    if (filtro === 'reflexoes') return p.tipo === 'reflexao';
    if (filtro === 'oracoes') return p.tipo === 'oracao';
    if (filtro === 'planos') return p.tipo === 'plano';
    return true;
  });

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    background: colors.bgSurface,
    border: `0.5px solid ${focusedField === field ? colors.gold : colors.border}`,
    borderRadius: 12,
    padding: '14px 16px',
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 1.7,
    resize: 'none' as const,
    outline: 'none',
    fontFamily: fonts.body,
    boxSizing: 'border-box' as const,
  });

  const canPublish = () => {
    if (tipoPost === 'versiculo') return !!versiculoHoje;
    if (tipoPost === 'plano') return !!planoAtivo;
    return conteudo.trim().length > 0;
  };

  const filtros = [
    { key: 'todos', label: 'Todos' },
    { key: 'versiculos', label: 'Versículos' },
    { key: 'reflexoes', label: 'Reflexões' },
    { key: 'oracoes', label: 'Orações' },
    { key: 'planos', label: 'Planos' },
  ];

  const tipoCards = [
    { tipo: 'versiculo' as const, emoji: '🌟', label: 'Versículo do dia' },
    { tipo: 'reflexao' as const, emoji: '✦', label: 'Reflexão pessoal' },
    { tipo: 'oracao' as const, emoji: '🙏', label: 'Pedido de oração' },
    { tipo: 'plano' as const, emoji: '📖', label: 'Plano de leitura' },
  ];

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, left: 24, right: 24, zIndex: 9999,
          background: colors.bgSurface, border: `0.5px solid ${colors.gold}`,
          borderRadius: 14, padding: '16px 18px',
          animation: 'slideDown 0.3s ease',
        }}>
          <style>{`
            @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
          <span style={{ fontSize: 14, color: colors.gold, fontWeight: 500 }}>🕊 Publicado na comunidade!</span>
        </div>
      )}

      {/* Abas internas */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 10,
        background: colors.bgPrimary, borderBottom: `0.5px solid ${colors.border}`,
        padding: '0 24px', display: 'flex',
      }}>
        {(['feed', 'compartilhar'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 15, fontFamily: fonts.body,
              color: tab === t ? colors.gold : colors.textDim,
              borderBottom: tab === t ? `2px solid ${colors.gold}` : '2px solid transparent',
              paddingBottom: 12, paddingTop: 14, marginRight: 24,
            }}
          >
            {t === 'feed' ? 'Feed' : 'Compartilhar'}
          </button>
        ))}
      </div>

      {tab === 'feed' ? (
        <div>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, padding: '16px 24px', overflowX: 'auto' }}>
            {filtros.map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                style={{
                  background: filtro === f.key ? colors.gold : colors.bgSurface,
                  color: filtro === f.key ? colors.bgPrimary : colors.textMuted,
                  border: filtro === f.key ? 'none' : `0.5px solid ${colors.border}`,
                  borderRadius: 20, padding: '7px 16px', fontSize: 13,
                  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: fonts.body,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              <div style={{
                width: 28, height: 28, border: `2px solid ${colors.border}`,
                borderTop: `2px solid ${colors.gold}`, borderRadius: '50%',
                animation: 'spin 1s linear infinite', margin: '0 auto',
              }} />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px' }}>
              <span style={{ fontSize: 40, opacity: 0.2, marginBottom: 16 }}>🕊</span>
              <p style={{ fontFamily: fonts.display, fontSize: 20, color: colors.textDim, textAlign: 'center', margin: 0 }}>
                Seja o primeiro a compartilhar
              </p>
              <p style={{ fontSize: 13, color: '#2A3F52', textAlign: 'center', marginTop: 8, lineHeight: 1.6 }}>
                Compartilhe um versículo, reflexão ou pedido de oração com a comunidade.
              </p>
            </div>
          ) : (
            <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>
              {filteredPosts.map(post => {
                const badge = tipoBadge(post.tipo);
                return (
                  <div key={post.id} style={{
                    background: colors.bgSurface, border: `0.5px solid ${colors.border}`,
                    borderRadius: 14, padding: 18, position: 'relative',
                  }}>
                    {/* Delete */}
                    {post.user_id === userId && (
                      <button
                        onClick={() => deletePost(post.id)}
                        style={{
                          position: 'absolute', top: 14, right: 14,
                          background: 'none', border: 'none', fontSize: 16,
                          color: colors.textDim, cursor: 'pointer', padding: 0,
                        }}
                      >×</button>
                    )}

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: colors.bgHover,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontFamily: fonts.display, fontSize: 15, color: colors.gold }}>
                            {(post.nome_usuario || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 500, margin: 0 }}>
                            {post.nome_usuario}
                          </p>
                          <p style={{ fontSize: 11, color: colors.textDim, margin: '2px 0 0' }}>
                            {timeAgo(post.criado_em)}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, padding: '3px 10px', borderRadius: 20,
                        border: `0.5px solid ${badge.border}`, color: badge.color, background: badge.bg,
                      }}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Content */}
                    {post.referencia_biblica && (
                      <p style={{ fontFamily: fonts.display, fontSize: 15, color: colors.gold, margin: '0 0 8px' }}>
                        {post.referencia_biblica}
                      </p>
                    )}
                    <p style={{ fontSize: 14, color: '#9BAFC0', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {post.conteudo}
                    </p>

                    {/* Reações */}
                    <div style={{
                      display: 'flex', gap: 8, marginTop: 14, paddingTop: 12,
                      borderTop: `0.5px solid ${colors.border}`,
                    }}>
                      {([
                        { tipo: 'orando' as const, emoji: '🙏', count: post.reacoes.orando, active: post.minhasReacoes.orando },
                        { tipo: 'amei' as const, emoji: '❤️', count: post.reacoes.amei, active: post.minhasReacoes.amei },
                        { tipo: 'gratidao' as const, emoji: '🙌', count: post.reacoes.gratidao, active: post.minhasReacoes.gratidao },
                      ]).map(r => (
                        <button
                          key={r.tipo}
                          onClick={() => toggleReacao(post.id, r.tipo)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 13, cursor: 'pointer', padding: '6px 12px', borderRadius: 20,
                            background: r.active ? colors.bgSurface : colors.bgHover,
                            border: `0.5px solid ${r.active ? colors.gold : 'transparent'}`,
                            color: r.active ? colors.gold : colors.textMuted,
                            fontFamily: fonts.body,
                            transition: 'all 0.15s',
                          }}
                        >
                          {r.emoji} {r.count > 0 && r.count}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ABA COMPARTILHAR */
        <div style={{ padding: 24 }}>
          <h2 style={{ fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary, margin: 0 }}>
            Compartilhar
          </h2>
          <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 28 }}>
            Edifique outros com o que Deus tem feito em você.
          </p>

          {/* Tipo selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {tipoCards.map(tc => (
              <button
                key={tc.tipo}
                onClick={() => { setTipoPost(tc.tipo); setConteudo(''); setReferencia(''); }}
                style={{
                  background: tipoPost === tc.tipo ? colors.bgHover : colors.bgSurface,
                  border: `0.5px solid ${tipoPost === tc.tipo ? colors.gold : colors.border}`,
                  borderRadius: 12, padding: 16, textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22, display: 'block' }}>{tc.emoji}</span>
                <span style={{ fontSize: 12, color: tipoPost === tc.tipo ? colors.gold : colors.textMuted, marginTop: 8, display: 'block' }}>
                  {tc.label}
                </span>
              </button>
            ))}
          </div>

          {/* Campos por tipo */}
          {tipoPost === 'versiculo' && (
            <>
              {versiculoHoje ? (
                <div style={{
                  background: colors.bgHover, border: `0.5px solid ${colors.gold}`,
                  borderRadius: 12, padding: 16, marginBottom: 16,
                }}>
                  <p style={{ fontFamily: fonts.display, fontSize: 14, color: colors.gold, margin: 0 }}>
                    {versiculoHoje.referencia}
                  </p>
                  <p style={{ fontSize: 13, color: '#9BAFC0', fontStyle: 'italic', marginTop: 6, lineHeight: 1.6, margin: '6px 0 0' }}>
                    {versiculoHoje.texto}
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: colors.textDim, marginBottom: 16 }}>
                  Gere seu versículo do dia primeiro na aba Início.
                </p>
              )}
              <p style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                ADICIONE UMA REFLEXÃO (opcional)
              </p>
              <textarea
                style={{ ...inputStyle('versiculo-reflexao'), minHeight: 80 }}
                placeholder="O que este versículo significou para você hoje?"
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                onFocus={() => setFocusedField('versiculo-reflexao')}
                onBlur={() => setFocusedField(null)}
              />
            </>
          )}

          {tipoPost === 'reflexao' && (
            <>
              <p style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                REFERÊNCIA BÍBLICA (opcional)
              </p>
              <input
                style={{ ...inputStyle('ref'), marginBottom: 16 } as any}
                placeholder="Ex: Salmos 23"
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                onFocus={() => setFocusedField('ref')}
                onBlur={() => setFocusedField(null)}
              />
              <p style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                SUA REFLEXÃO
              </p>
              <textarea
                style={{ ...inputStyle('reflexao'), minHeight: 120 }}
                placeholder="Compartilhe o que Deus tem falado com você..."
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                onFocus={() => setFocusedField('reflexao')}
                onBlur={() => setFocusedField(null)}
              />
            </>
          )}

          {tipoPost === 'oracao' && (
            <>
              <p style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                SEU PEDIDO
              </p>
              <textarea
                style={{ ...inputStyle('oracao'), minHeight: 140 }}
                placeholder="Descreva seu pedido. A comunidade vai orar com você."
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                onFocus={() => setFocusedField('oracao')}
                onBlur={() => setFocusedField(null)}
              />
              <p style={{ fontSize: 12, color: colors.textDim, marginTop: 8 }}>
                💙 Sua comunidade vai orar por você.
              </p>
            </>
          )}

          {tipoPost === 'plano' && (
            <>
              {planoAtivo ? (
                <div style={{
                  background: colors.bgSurface, border: `0.5px solid ${colors.border}`,
                  borderRadius: 12, padding: 16,
                }}>
                  <p style={{ fontFamily: fonts.display, fontSize: 16, color: colors.gold, margin: 0 }}>
                    {planoAtivo.titulo}
                  </p>
                  <span style={{
                    fontSize: 11, color: colors.textDim,
                    background: colors.bgHover, padding: '3px 10px', borderRadius: 20,
                    display: 'inline-block', marginTop: 8,
                  }}>
                    {planoProgresso.concluidos} de {planoProgresso.total} dias concluídos
                  </span>
                  <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 1.6, margin: '8px 0 0' }}>
                    {planoAtivo.descricao}
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ fontSize: 13, color: colors.textDim }}>Você não tem um plano ativo no momento.</p>
                  <button
                    onClick={() => onNavigateTab?.('plano')}
                    style={{
                      marginTop: 12, background: 'none', border: `0.5px solid ${colors.gold}`,
                      color: colors.gold, borderRadius: 10, padding: '10px 20px',
                      fontSize: 13, cursor: 'pointer', fontFamily: fonts.body,
                    }}
                  >
                    Gerar meu plano
                  </button>
                </div>
              )}
            </>
          )}

          {/* Publicar */}
          <button
            onClick={publicar}
            disabled={!canPublish() || publishing}
            style={{
              marginTop: 28, width: '100%', padding: 16,
              background: canPublish() ? colors.gold : colors.border,
              color: canPublish() ? colors.bgPrimary : colors.textDim,
              border: 'none', borderRadius: 12, fontSize: 15,
              fontFamily: fonts.body, fontWeight: 500,
              cursor: canPublish() ? 'pointer' : 'default',
              opacity: publishing ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {publishing ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Comunidade;
