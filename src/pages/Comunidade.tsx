import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { colors, fonts } from "@/styles/theme";

interface Post {
  id: string;
  user_id: string;
  tipo: string;
  conteudo: string;
  referencia_biblica: string | null;
  nome_usuario: string;
  criado_em: string;
  orando_count: number;
  amei_count: number;
  gratidao_count: number;
  eu_orei: boolean;
  eu_amei: boolean;
  eu_agradeci: boolean;
}

interface ComunidadeProps {
  onNavigateTab?: (tab: string) => void;
}

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
};

const typeBadge = (tipo: string) => {
  const map: Record<string, { label: string; color: string; border: string; bg: string }> = {
    versiculo: { label: "Versículo", color: colors.gold, border: colors.goldDim, bg: "#1A1000" },
    reflexao: { label: "Reflexão", color: colors.textMuted, border: colors.border, bg: colors.bgSurface },
    oracao: { label: "Oração", color: "#9BAFC0", border: colors.border, bg: colors.bgSurface },
    plano: { label: "Plano", color: colors.success, border: "#0F2A1A", bg: "#091A0E" },
  };
  const s = map[tipo] || map.reflexao;
  return (
    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, border: `0.5px solid ${s.border}`, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
};

const Comunidade: React.FC<ComunidadeProps> = ({ onNavigateTab }) => {
  const { session, profile } = useAuth();
  const userId = session?.user?.id;

  const [tab, setTab] = useState<"feed" | "compartilhar">("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState("todos");
  const [loading, setLoading] = useState(true);

  // Share state
  const [shareTipo, setShareTipo] = useState<string>("versiculo");
  const [shareConteudo, setShareConteudo] = useState("");
  const [shareRef, setShareRef] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState(false);
  const [versiculoHoje, setVersiculoHoje] = useState<{ referencia: string; texto: string } | null>(null);
  const [planoAtivo, setPlanoAtivo] = useState<any>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data: postsData } = await supabase
      .from("posts_comunidade")
      .select("*")
      .eq("visivel", true)
      .order("criado_em", { ascending: false })
      .limit(30);

    if (!postsData) { setLoading(false); return; }

    const postIds = postsData.map((p) => p.id);
    const { data: reacoes } = postIds.length > 0
      ? await supabase.from("reacoes_posts").select("*").in("post_id", postIds)
      : { data: [] };

    const enriched: Post[] = postsData.map((p) => {
      const postReacoes = (reacoes || []).filter((r) => r.post_id === p.id);
      return {
        ...p,
        orando_count: postReacoes.filter((r) => r.tipo === "orando").length,
        amei_count: postReacoes.filter((r) => r.tipo === "amei").length,
        gratidao_count: postReacoes.filter((r) => r.tipo === "gratidao").length,
        eu_orei: postReacoes.some((r) => r.tipo === "orando" && r.user_id === userId),
        eu_amei: postReacoes.some((r) => r.tipo === "amei" && r.user_id === userId),
        eu_agradeci: postReacoes.some((r) => r.tipo === "gratidao" && r.user_id === userId),
      };
    });

    setPosts(enriched);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    if (!userId) return;
    // Load versiculo do dia
    const cached = localStorage.getItem(`carmelo:versiculoHoje:${userId}`);
    if (cached) {
      try {
        const p = JSON.parse(cached);
        if (p.date === new Date().toISOString().split("T")[0] && p.data) {
          setVersiculoHoje(p.data);
        }
      } catch { /* */ }
    }
    // Load plano ativo
    supabase.from("planos_leitura").select("*").eq("user_id", userId).eq("status", "ativo").limit(1)
      .then(({ data }) => { if (data && data.length > 0) setPlanoAtivo(data[0]); });
  }, [userId]);

  const toggleReacao = async (postId: string, tipo: string) => {
    if (!userId) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const flagKey = tipo === "orando" ? "eu_orei" : tipo === "amei" ? "eu_amei" : "eu_agradeci";
    const countKey = tipo === "orando" ? "orando_count" : tipo === "amei" ? "amei_count" : "gratidao_count";
    const isActive = post[flagKey];

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, [flagKey]: !isActive, [countKey]: p[countKey] + (isActive ? -1 : 1) }
          : p
      )
    );

    if (isActive) {
      await supabase.from("reacoes_posts").delete().eq("post_id", postId).eq("user_id", userId).eq("tipo", tipo);
    } else {
      await supabase.from("reacoes_posts").insert({ post_id: postId, user_id: userId, tipo });
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Excluir este post?")) return;
    await supabase.from("posts_comunidade").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePublish = async () => {
    if (!userId || !profile) return;
    setPublishing(true);

    let conteudo = shareConteudo;
    let ref = shareRef || null;

    if (shareTipo === "versiculo" && versiculoHoje) {
      const base = `"${versiculoHoje.texto}"`;
      conteudo = shareConteudo ? `${base}\n\n${shareConteudo}` : base;
      ref = versiculoHoje.referencia;
    }

    if (shareTipo === "plano" && planoAtivo) {
      conteudo = planoAtivo.descricao;
      ref = planoAtivo.titulo;
    }

    if (!conteudo.trim()) { setPublishing(false); return; }

    await supabase.from("posts_comunidade").insert({
      user_id: userId,
      tipo: shareTipo,
      conteudo: conteudo.trim(),
      referencia_biblica: ref,
      nome_usuario: profile.nome || "Anônimo",
    });

    setShareConteudo("");
    setShareRef("");
    setPublishing(false);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
    setTab("feed");
    fetchPosts();
  };

  const filteredPosts = filter === "todos"
    ? posts
    : posts.filter((p) => {
        if (filter === "versiculos") return p.tipo === "versiculo";
        if (filter === "reflexoes") return p.tipo === "reflexao";
        if (filter === "oracoes") return p.tipo === "oracao";
        if (filter === "planos") return p.tipo === "plano";
        return true;
      });

  const inputStyle = (field: string): React.CSSProperties => ({
    background: colors.bgSurface,
    border: `0.5px solid ${focusedField === field ? colors.gold : colors.border}`,
    borderRadius: 12,
    padding: "14px 16px",
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 1.7,
    resize: "none" as const,
    outline: "none",
    width: "100%",
    fontFamily: fonts.body,
    boxSizing: "border-box" as const,
  });

  const canPublish =
    (shareTipo === "versiculo" && versiculoHoje) ||
    (shareTipo === "plano" && planoAtivo) ||
    (shareTipo === "reflexao" && shareConteudo.trim()) ||
    (shareTipo === "oracao" && shareConteudo.trim());

  return (
    <div>
      <style>{`
        @keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slideUp{from{transform:translateY(0);opacity:1}to{transform:translateY(-20px);opacity:0}}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 80, left: 24, right: 24, zIndex: 9999,
          background: colors.bgSurface, border: `0.5px solid ${colors.gold}`,
          borderRadius: 14, padding: "16px 18px", animation: "slideDown 0.3s ease",
        }}>
          <p style={{ fontSize: 14, color: colors.gold, fontWeight: 500, margin: 0 }}>🕊 Publicado na comunidade!</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        position: "sticky", top: 64, zIndex: 10, background: colors.bgPrimary,
        borderBottom: `0.5px solid ${colors.border}`, padding: "0 24px",
      }}>
        {(["feed", "compartilhar"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none", border: "none", borderBottom: tab === t ? `2px solid ${colors.gold}` : "2px solid transparent",
              color: tab === t ? colors.gold : colors.textDim,
              paddingBottom: 12, paddingTop: 14, fontSize: 15, fontFamily: fonts.body,
              cursor: "pointer", marginRight: 24,
            }}
          >
            {t === "feed" ? "Feed" : "Compartilhar"}
          </button>
        ))}
      </div>

      {/* FEED TAB */}
      {tab === "feed" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, padding: "16px 24px", overflowX: "auto" }}>
            {[
              { key: "todos", label: "Todos" },
              { key: "versiculos", label: "Versículos" },
              { key: "reflexoes", label: "Reflexões" },
              { key: "oracoes", label: "Orações" },
              { key: "planos", label: "Planos" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  background: filter === f.key ? colors.gold : colors.bgSurface,
                  color: filter === f.key ? colors.bgPrimary : colors.textMuted,
                  border: filter === f.key ? "none" : `0.5px solid ${colors.border}`,
                  borderRadius: 20, padding: "7px 16px", fontSize: 13,
                  cursor: "pointer", whiteSpace: "nowrap", fontFamily: fonts.body,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              <div style={{ width: 32, height: 32, border: `2px solid ${colors.border}`, borderTop: `2px solid ${colors.gold}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px" }}>
              <span style={{ fontSize: 40, opacity: 0.2, marginBottom: 16 }}>🕊</span>
              <p style={{ fontFamily: fonts.display, fontSize: 20, color: colors.textDim, textAlign: "center", margin: 0 }}>
                Seja o primeiro a compartilhar
              </p>
              <p style={{ fontSize: 13, color: "#2A3F52", textAlign: "center", marginTop: 8, lineHeight: 1.6 }}>
                Compartilhe um versículo, reflexão ou pedido de oração com a comunidade.
              </p>
            </div>
          ) : (
            <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 24 }}>
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    background: colors.bgSurface, border: `0.5px solid ${colors.border}`,
                    borderRadius: 14, padding: 18, position: "relative",
                  }}
                >
                  {/* Delete button */}
                  {post.user_id === userId && (
                    <button
                      onClick={() => deletePost(post.id)}
                      style={{
                        position: "absolute", top: 14, right: 14,
                        background: "none", border: "none", fontSize: 16, color: colors.textDim,
                        cursor: "pointer", padding: 0,
                      }}
                    >×</button>
                  )}

                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", background: colors.bgHover,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontFamily: fonts.display, fontSize: 15, color: colors.gold }}>
                          {(post.nome_usuario || "A")[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 500, margin: 0 }}>{post.nome_usuario}</p>
                        <p style={{ fontSize: 11, color: colors.textDim, margin: "2px 0 0" }}>{timeAgo(post.criado_em)}</p>
                      </div>
                    </div>
                    {typeBadge(post.tipo)}
                  </div>

                  {/* Content */}
                  {post.referencia_biblica && (
                    <p style={{ fontFamily: fonts.display, fontSize: 15, color: colors.gold, margin: "0 0 8px" }}>
                      {post.referencia_biblica}
                    </p>
                  )}
                  <p style={{ fontSize: 14, color: "#9BAFC0", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
                    {post.conteudo}
                  </p>

                  {/* Reactions */}
                  <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 12, borderTop: `0.5px solid ${colors.border}` }}>
                    {[
                      { emoji: "🙏", tipo: "orando", count: post.orando_count, active: post.eu_orei },
                      { emoji: "❤️", tipo: "amei", count: post.amei_count, active: post.eu_amei },
                      { emoji: "🙌", tipo: "gratidao", count: post.gratidao_count, active: post.eu_agradeci },
                    ].map((r) => (
                      <button
                        key={r.tipo}
                        onClick={() => toggleReacao(post.id, r.tipo)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          fontSize: 13, cursor: "pointer", padding: "6px 12px", borderRadius: 20,
                          background: r.active ? colors.bgSurface : colors.bgHover,
                          border: r.active ? `0.5px solid ${colors.gold}` : "0.5px solid transparent",
                          color: r.active ? colors.gold : colors.textMuted,
                          fontFamily: fonts.body, transition: "all 0.15s",
                        }}
                      >
                        {r.emoji} {r.count > 0 && r.count}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SHARE TAB */}
      {tab === "compartilhar" && (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary, margin: 0, fontWeight: 400 }}>
            Compartilhar
          </h2>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: "6px 0 28px" }}>
            Edifique outros com o que Deus tem feito em você.
          </p>

          {/* Type selector */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[
              { tipo: "versiculo", emoji: "🌟", label: "Versículo do dia" },
              { tipo: "reflexao", emoji: "✦", label: "Reflexão pessoal" },
              { tipo: "oracao", emoji: "🙏", label: "Pedido de oração" },
              { tipo: "plano", emoji: "📖", label: "Plano de leitura" },
            ].map((t) => (
              <button
                key={t.tipo}
                onClick={() => { setShareTipo(t.tipo); setShareConteudo(""); setShareRef(""); }}
                style={{
                  background: shareTipo === t.tipo ? colors.bgHover : colors.bgSurface,
                  border: `0.5px solid ${shareTipo === t.tipo ? colors.gold : colors.border}`,
                  borderRadius: 12, padding: 16, textAlign: "center",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 22, display: "block" }}>{t.emoji}</span>
                <span style={{ fontSize: 12, color: shareTipo === t.tipo ? colors.gold : colors.textMuted, marginTop: 8, display: "block" }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          {/* Versiculo */}
          {shareTipo === "versiculo" && (
            <>
              {versiculoHoje ? (
                <div style={{ background: colors.bgHover, border: `0.5px solid ${colors.gold}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <p style={{ fontFamily: fonts.display, fontSize: 14, color: colors.gold, margin: 0 }}>{versiculoHoje.referencia}</p>
                  <p style={{ fontSize: 13, color: "#9BAFC0", fontStyle: "italic", marginTop: 6, lineHeight: 1.6, margin: "6px 0 0" }}>
                    "{versiculoHoje.texto}"
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: colors.textDim, marginBottom: 16 }}>
                  Você ainda não gerou o versículo de hoje.
                </p>
              )}
              <p style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 8px" }}>
                ADICIONE UMA REFLEXÃO (opcional)
              </p>
              <textarea
                style={{ ...inputStyle("versiculo-text"), minHeight: 80 }}
                placeholder="O que este versículo significou para você hoje?"
                value={shareConteudo}
                onChange={(e) => setShareConteudo(e.target.value)}
                onFocus={() => setFocusedField("versiculo-text")}
                onBlur={() => setFocusedField(null)}
              />
            </>
          )}

          {/* Reflexao */}
          {shareTipo === "reflexao" && (
            <>
              <p style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 8px" }}>
                REFERÊNCIA BÍBLICA (opcional)
              </p>
              <input
                style={{ ...inputStyle("ref"), marginBottom: 16 }}
                placeholder="Ex: Salmos 23"
                value={shareRef}
                onChange={(e) => setShareRef(e.target.value)}
                onFocus={() => setFocusedField("ref")}
                onBlur={() => setFocusedField(null)}
              />
              <p style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 8px" }}>
                SUA REFLEXÃO
              </p>
              <textarea
                style={{ ...inputStyle("reflexao-text"), minHeight: 120 }}
                placeholder="Compartilhe o que Deus tem falado com você..."
                value={shareConteudo}
                onChange={(e) => setShareConteudo(e.target.value)}
                onFocus={() => setFocusedField("reflexao-text")}
                onBlur={() => setFocusedField(null)}
              />
            </>
          )}

          {/* Oracao */}
          {shareTipo === "oracao" && (
            <>
              <p style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 8px" }}>
                SEU PEDIDO
              </p>
              <textarea
                style={{ ...inputStyle("oracao-text"), minHeight: 140 }}
                placeholder="Descreva seu pedido. A comunidade vai orar com você."
                value={shareConteudo}
                onChange={(e) => setShareConteudo(e.target.value)}
                onFocus={() => setFocusedField("oracao-text")}
                onBlur={() => setFocusedField(null)}
              />
              <p style={{ fontSize: 12, color: colors.textDim, marginTop: 8 }}>💙 Sua comunidade vai orar por você.</p>
            </>
          )}

          {/* Plano */}
          {shareTipo === "plano" && (
            <>
              {planoAtivo ? (
                <div style={{ background: colors.bgHover, border: `0.5px solid ${colors.gold}`, borderRadius: 12, padding: 16 }}>
                  <p style={{ fontFamily: fonts.display, fontSize: 16, color: colors.gold, margin: 0 }}>{planoAtivo.titulo}</p>
                  <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, lineHeight: 1.6, margin: "6px 0 0" }}>{planoAtivo.descricao}</p>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <p style={{ fontSize: 14, color: colors.textDim }}>Você não tem um plano ativo no momento.</p>
                  <button
                    onClick={() => onNavigateTab?.("plano")}
                    style={{
                      background: "none", border: `0.5px solid ${colors.gold}`, color: colors.gold,
                      borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer", marginTop: 12,
                      fontFamily: fonts.body,
                    }}
                  >
                    Gerar meu plano
                  </button>
                </div>
              )}
            </>
          )}

          {/* Publish button */}
          <button
            onClick={handlePublish}
            disabled={!canPublish || publishing}
            style={{
              marginTop: 28, width: "100%", padding: 16, borderRadius: 12, border: "none",
              fontSize: 15, fontFamily: fonts.body, fontWeight: 500, cursor: canPublish ? "pointer" : "default",
              background: canPublish ? colors.gold : colors.border,
              color: canPublish ? colors.bgPrimary : colors.textDim,
              transition: "opacity 0.15s",
              opacity: publishing ? 0.6 : 1,
            }}
          >
            {publishing ? "Publicando..." : "Publicar"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Comunidade;
