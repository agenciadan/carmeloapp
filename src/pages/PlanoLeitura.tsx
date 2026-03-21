import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { colors, fonts } from "@/styles/theme";

interface Plano {
  id: string;
  titulo: string;
  descricao: string;
  total_dias: number;
  status: string;
  gerado_em: string;
  proximo_plano_em: string | null;
  compartilhado: boolean;
}

interface DiaLeitura {
  id: string;
  plano_id: string;
  dia_numero: number;
  referencia: string;
  titulo_passagem: string;
  reflexao_ia: string;
  concluido: boolean;
  concluido_em: string | null;
}

const PlanoLeitura: React.FC = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [plano, setPlano] = useState<Plano | null>(null);
  const [dias, setDias] = useState<DiaLeitura[]>([]);
  const [estado, setEstado] = useState<"loading-init" | "empty" | "generating" | "active">("loading-init");
  const [historicoCount, setHistoricoCount] = useState(0);
  const [loadingText, setLoadingText] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const loadingTexts = [
    "Analisando sua jornada...",
    "Escolhendo as passagens...",
    "Preparando seu plano...",
  ];

  const fetchPlano = useCallback(async () => {
    if (!userId) return;

    const { data: planos } = await supabase
      .from("planos_leitura")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ativo")
      .order("gerado_em", { ascending: false })
      .limit(1);

    if (planos && planos.length > 0) {
      const p = planos[0] as Plano;
      setPlano(p);

      const { data: diasData } = await supabase
        .from("dias_leitura")
        .select("*")
        .eq("plano_id", p.id)
        .order("dia_numero", { ascending: true });

      setDias((diasData || []) as DiaLeitura[]);
      setEstado("active");
    } else {
      // Check for completed plan
      const { data: concluidos } = await supabase
        .from("planos_leitura")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "concluido")
        .order("gerado_em", { ascending: false })
        .limit(1);

      if (concluidos && concluidos.length > 0) {
        const p = concluidos[0] as Plano;
        setPlano(p);
        const { data: diasData } = await supabase
          .from("dias_leitura")
          .select("*")
          .eq("plano_id", p.id)
          .order("dia_numero", { ascending: true });
        setDias((diasData || []) as DiaLeitura[]);
        setEstado("active");
      } else {
        setEstado("empty");
      }
    }

    // Count historico
    const { count } = await supabase
      .from("historico")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    setHistoricoCount(count || 0);
  }, [userId]);

  useEffect(() => {
    fetchPlano();
  }, [fetchPlano]);

  // Loading text rotation
  useEffect(() => {
    if (estado !== "generating") return;
    const interval = setInterval(() => {
      setLoadingText((p) => (p + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, [estado]);

  const handleGenerate = async () => {
    setEstado("generating");
    setLoadingText(0);

    try {
      const { data, error } = await supabase.functions.invoke("gerar-plano-leitura");

      if (error) throw new Error(error.message);
      if (!data?.plano) throw new Error("Resposta inválida");

      setPlano(data.plano as Plano);
      setDias((data.dias || []) as DiaLeitura[]);
      setEstado("active");
    } catch (err: any) {
      console.error("Erro ao gerar plano:", err);
      setEstado("empty");
    }
  };

  const handleMarkDone = async (dia: DiaLeitura) => {
    const now = new Date().toISOString();
    await supabase
      .from("dias_leitura")
      .update({ concluido: true, concluido_em: now })
      .eq("id", dia.id);

    const updated = dias.map((d) =>
      d.id === dia.id ? { ...d, concluido: true, concluido_em: now } : d
    );
    setDias(updated);

    // Check if all done
    const allDone = updated.every((d) => d.concluido);
    if (allDone && plano) {
      await supabase
        .from("planos_leitura")
        .update({ status: "concluido" })
        .eq("id", plano.id);

      // Save to historico
      if (userId) {
        const dataFormatada = new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        await supabase.from("historico").insert({
          user_id: userId,
          tipo: "plano",
          data_formatada: dataFormatada,
          referencia: plano.titulo,
          texto_preview: plano.descricao.substring(0, 100),
          dados_completos: {
            titulo: plano.titulo,
            descricao: plano.descricao,
            total_dias: plano.total_dias,
            gerado_em: plano.gerado_em,
          } as any,
        });
      }

      setPlano({ ...plano, status: "concluido" });

      // Show toast
      const nextDate = plano.proximo_plano_em
        ? new Date(plano.proximo_plano_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
        : "em breve";
      setToast(`Novo plano disponível em ${nextDate}.`);
      setTimeout(() => setToast(null), 4500);
    }
  };

  const canGenerateNew = plano?.status === "concluido" &&
    plano.proximo_plano_em &&
    new Date(plano.proximo_plano_em) <= new Date();

  const concluidos = dias.filter((d) => d.concluido).length;

  // TOAST
  const renderToast = () => {
    if (!toast) return null;
    return (
      <div
        style={{
          position: "fixed",
          top: 80,
          left: 24,
          right: 24,
          zIndex: 9999,
          background: colors.bgSurface,
          border: `0.5px solid ${colors.gold}`,
          borderRadius: 14,
          padding: "16px 18px",
          animation: "slideDown 0.3s ease",
        }}
      >
        <p style={{ fontSize: 14, color: colors.gold, fontWeight: 500, margin: 0 }}>
          🎉 Plano concluído!
        </p>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: "4px 0 0" }}>{toast}</p>
      </div>
    );
  };

  // LOADING INIT
  if (estado === "loading-init") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div
          style={{
            width: 32,
            height: 32,
            border: `2px solid ${colors.border}`,
            borderTop: `2px solid ${colors.gold}`,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  // GENERATING
  if (estado === "generating") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          padding: 24,
        }}
      >
        <style>{`
          @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          @keyframes fadeText{0%{opacity:0;transform:translateY(8px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-8px)}}
        `}</style>
        <div
          style={{
            width: 36,
            height: 36,
            border: `2px solid ${colors.border}`,
            borderTop: `2px solid ${colors.gold}`,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p
          key={loadingText}
          style={{
            fontFamily: fonts.display,
            fontStyle: "italic",
            fontSize: 18,
            color: colors.textMuted,
            marginTop: 20,
            textAlign: "center",
            animation: "fadeText 2.5s ease",
          }}
        >
          {loadingTexts[loadingText]}
        </p>
      </div>
    );
  }

  // EMPTY STATE
  if (estado === "empty" && !plano) {
    return (
      <div
        style={{
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "60vh",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 48, opacity: 0.5, marginBottom: 24 }}>📖</span>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: 26,
            color: colors.textPrimary,
            textAlign: "center",
            margin: 0,
            fontWeight: 400,
          }}
        >
          Seu plano personalizado
        </h2>
        <p
          style={{
            fontSize: 14,
            color: colors.textMuted,
            textAlign: "center",
            marginTop: 12,
            lineHeight: 1.7,
            maxWidth: 320,
          }}
        >
          A IA analisa sua jornada dos últimos 7 dias e cria um plano de leitura único para o seu
          momento espiritual atual.
        </p>

        {historicoCount < 3 ? (
          <div
            style={{
              background: colors.bgSurface,
              border: `0.5px solid ${colors.border}`,
              borderRadius: 14,
              padding: 18,
              marginTop: 24,
              width: "100%",
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: colors.textDim,
                textTransform: "uppercase",
                letterSpacing: 2,
                marginBottom: 8,
                margin: "0 0 8px",
              }}
            >
              PARA COMEÇAR
            </p>
            <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6, margin: "0 0 12px" }}>
              Use o versículo do dia e o aconselhamento por pelo menos 3 dias para receber seu
              primeiro plano personalizado.
            </p>
            <div
              style={{
                background: colors.border,
                height: 4,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: colors.gold,
                  height: "100%",
                  borderRadius: 2,
                  width: `${(historicoCount / 3) * 100}%`,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <p style={{ fontSize: 12, color: colors.textDim, marginTop: 8, margin: "8px 0 0" }}>
              {historicoCount} de 3 dias completos
            </p>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            style={{
              marginTop: 32,
              width: "100%",
              background: colors.gold,
              color: colors.bgPrimary,
              border: "none",
              borderRadius: 12,
              padding: 16,
              fontSize: 15,
              fontFamily: fonts.body,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Gerar meu plano
          </button>
        )}
      </div>
    );
  }

  // ACTIVE / COMPLETED PLAN
  if (!plano) return null;

  const nextDate = plano.proximo_plano_em
    ? new Date(plano.proximo_plano_em).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
      })
    : null;

  return (
    <div style={{ padding: 24 }}>
      <style>{`
        @keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
      {renderToast()}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            fontSize: 11,
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            margin: 0,
          }}
        >
          {plano.status === "concluido" ? "PLANO CONCLUÍDO" : "SEU PLANO ATUAL"}
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginTop: 8,
          }}
        >
          <h2
            style={{
              fontFamily: fonts.display,
              fontSize: 22,
              color: colors.gold,
              margin: 0,
              fontWeight: 400,
              flex: 1,
            }}
          >
            {plano.titulo}
          </h2>
        </div>
        <p
          style={{
            fontSize: 14,
            color: "#9BAFC0",
            fontStyle: "italic",
            marginTop: 8,
            lineHeight: 1.7,
            margin: "8px 0 0",
          }}
        >
          {plano.descricao}
        </p>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: colors.textDim, marginBottom: 8, margin: "0 0 8px" }}>
          {concluidos} de {plano.total_dias} dias concluídos
        </p>
        <div style={{ background: colors.border, height: 6, borderRadius: 3, overflow: "hidden" }}>
          <div
            style={{
              background: colors.gold,
              height: "100%",
              borderRadius: 3,
              width: `${(concluidos / plano.total_dias) * 100}%`,
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>

      {/* Days */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {dias.map((dia) => (
          <div
            key={dia.id}
            style={{
              background: dia.concluido ? colors.bgHover : colors.bgSurface,
              border: `0.5px solid ${dia.concluido ? colors.gold : colors.border}`,
              borderRadius: 14,
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: colors.textDim,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                DIA {dia.dia_numero}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 20,
                  ...(dia.concluido
                    ? {
                        background: "#0F2A1A",
                        color: colors.success,
                        border: `0.5px solid ${colors.success}`,
                      }
                    : {
                        background: colors.border,
                        color: colors.textDim,
                      }),
                }}
              >
                {dia.concluido ? "✓ Concluído" : "Pendente"}
              </span>
            </div>

            <p
              style={{
                fontFamily: fonts.display,
                fontSize: 18,
                color: colors.gold,
                marginTop: 10,
                margin: "10px 0 0",
              }}
            >
              {dia.referencia}
            </p>
            <p style={{ fontSize: 14, color: colors.textPrimary, marginTop: 4, margin: "4px 0 0" }}>
              {dia.titulo_passagem}
            </p>
            <p
              style={{
                fontSize: 13,
                color: colors.textMuted,
                lineHeight: 1.7,
                marginTop: 8,
                margin: "8px 0 0",
              }}
            >
              {dia.reflexao_ia}
            </p>

            {!dia.concluido && (
              <button
                onClick={() => handleMarkDone(dia)}
                style={{
                  border: `0.5px solid ${colors.gold}`,
                  color: colors.gold,
                  background: "transparent",
                  borderRadius: 10,
                  padding: "10px 0",
                  width: "100%",
                  marginTop: 14,
                  fontSize: 14,
                  fontFamily: fonts.body,
                  cursor: "pointer",
                }}
              >
                Marcar como lido
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        {plano.status === "concluido" && canGenerateNew ? (
          <button
            onClick={handleGenerate}
            style={{
              border: `0.5px solid ${colors.gold}`,
              color: colors.gold,
              background: "transparent",
              borderRadius: 12,
              padding: 12,
              width: "100%",
              fontSize: 14,
              fontFamily: fonts.body,
              cursor: "pointer",
            }}
          >
            Gerar novo plano
          </button>
        ) : nextDate ? (
          <p style={{ fontSize: 12, color: colors.textDim }}>
            {plano.status === "concluido"
              ? `Novo plano disponível em ${nextDate}`
              : `Novo plano gerado automaticamente em ${nextDate}`}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default PlanoLeitura;
