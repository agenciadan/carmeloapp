import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { colors, fonts } from "@/styles/theme";
import {
  emocionalVariations,
  contextoVariations,
  necessidadeVariations,
  pickRandom,
  QuizVariation,
} from "@/data/quizQuestions";

interface VersiculoResult {
  referencia: string;
  texto: string;
  aplicacao: string;
}

interface VersiculoDoDiaProps {
  onNavigateTab?: (tab: string) => void;
}

const weeklyVerses = [
  { texto: '"O SENHOR é o meu pastor; nada me faltará."', ref: "Salmos 23:1" },
  { texto: '"Tudo posso naquele que me fortalece."', ref: "Filipenses 4:13" },
  { texto: '"Porque eu, o SENHOR teu Deus, te sustento pela mão direita."', ref: "Isaías 41:13" },
  { texto: '"Entrega o teu caminho ao SENHOR; confia nele, e ele tudo fará."', ref: "Salmos 37:5" },
  { texto: '"A paz de Deus, que excede todo o entendimento, guardará os vossos corações."', ref: "Filipenses 4:7" },
  { texto: '"Sede fortes e corajosos. Não temais."', ref: "Deuteronômio 31:6" },
  { texto: '"Esta é a vitória que vence o mundo: a nossa fé."', ref: "1 João 5:4" },
];

const calcStreak = (dates: string[]): number => {
  if (!dates.length) return 0;
  const unique = [...new Set(dates.map((d) => d.split("T")[0]))].sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
};

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia,";
  if (h >= 12 && h < 18) return "Boa tarde,";
  return "Boa noite,";
};

const getFormattedDay = (): string => {
  return new Date()
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    })
    .replace(/^\w/, (c) => c.toUpperCase());
};

// Extrai o JSON do versículo de qualquer formato que a Edge Function retorne
const extractVersiculoResult = (data: any): VersiculoResult => {
  // Tenta as estruturas mais comuns de resposta
  const candidates = [data, data?.result, data?.data, data?.response, data?.message];

  for (const candidate of candidates) {
    if (!candidate) continue;

    // Já é um objeto com as chaves certas
    if (typeof candidate === "object" && candidate.referencia && candidate.texto && candidate.aplicacao) {
      return candidate as VersiculoResult;
    }

    // É uma string — tenta fazer parse
    if (typeof candidate === "string") {
      try {
        const clean = candidate.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (parsed.referencia && parsed.texto && parsed.aplicacao) {
          return parsed as VersiculoResult;
        }
      } catch {
        // continua tentando
      }
    }
  }

  // Tenta data.text como último recurso
  if (data?.text) {
    try {
      const clean = data.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.referencia && parsed.texto && parsed.aplicacao) {
        return parsed as VersiculoResult;
      }
    } catch {
      // falhou
    }
  }

  throw new Error(`Resposta inesperada da IA: ${JSON.stringify(data)}`);
};

const VersiculoDoDia: React.FC<VersiculoDoDiaProps> = ({ onNavigateTab }) => {
  const { session, profile } = useAuth();
  const userId = session?.user?.id;

  const [quiz, setQuiz] = useState<QuizVariation[]>([]);
  const [step, setStep] = useState(0);
  const [respostas, setRespostas] = useState<string[]>([]);
  const [result, setResult] = useState<VersiculoResult | null>(null);
  const [estado, setEstado] = useState<"quiz" | "loading" | "resultado" | "dashboard">("quiz");
  const [streak, setStreak] = useState(0);
  const [fadeIn, setFadeIn] = useState(false);
  const [resultFadeIn, setResultFadeIn] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nextDay, setNextDay] = useState<{ dia_numero: number; referencia: string; titulo_passagem: string; plano_titulo: string } | null>(null);

  const fetchStreak = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("historico").select("criado_em").eq("user_id", userId);
    if (data) setStreak(calcStreak(data.map((d) => d.criado_em)));
  }, [userId]);

  const fetchNextDay = useCallback(async () => {
    if (!userId) return;
    // Get active plan
    const { data: planos } = await supabase
      .from("planos_leitura")
      .select("id, titulo")
      .eq("user_id", userId)
      .eq("status", "ativo")
      .limit(1);

    if (!planos || planos.length === 0) { setNextDay(null); return; }

    const plano = planos[0];
    const { data: diasData } = await supabase
      .from("dias_leitura")
      .select("dia_numero, referencia, titulo_passagem")
      .eq("plano_id", plano.id)
      .eq("concluido", false)
      .order("dia_numero", { ascending: true })
      .limit(1);

    if (diasData && diasData.length > 0) {
      setNextDay({ ...diasData[0], plano_titulo: plano.titulo });
    } else {
      setNextDay(null);
    }
  }, [userId]);

  const initQuiz = useCallback(() => {
    setQuiz([pickRandom(emocionalVariations), pickRandom(contextoVariations), pickRandom(necessidadeVariations)]);
    setStep(0);
    setRespostas([]);
    setResult(null);
    setErro(null);
    setEstado("quiz");
  }, []);

  useEffect(() => {
    if (!userId) return;
    const cacheKey = `carmelo:versiculoHoje:${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.date === new Date().toISOString().split("T")[0] && parsed.data?.referencia) {
          setResult(parsed.data);
          setEstado("dashboard");
          setFadeIn(true);
          fetchStreak();
          fetchNextDay();
          return;
        }
      } catch {
        /* ignora cache corrompido */
      }
    }
    initQuiz();
    fetchStreak();
    fetchNextDay();
  }, [userId, fetchStreak, fetchNextDay, initQuiz]);

  const handleAnswer = async (value: string) => {
    const newRespostas = [...respostas, value];
    setRespostas(newRespostas);

    if (newRespostas.length < 3) {
      setStep(step + 1);
      return;
    }

    setEstado("loading");
    setErro(null);

    const systemPrompt =
      "Você é um conselheiro bíblico sábio com conhecimento profundo de toda a Bíblia Sagrada. Sua tarefa é selecionar UM versículo genuinamente relevante para o momento do usuário. REGRAS OBRIGATÓRIAS: 1. Explore toda a Bíblia — Antigo e Novo Testamento têm igual valor. Não fique preso em livros populares como Filipenses, Salmos ou João. Considere ativamente livros menos explorados: Rute, Ester, Habacuque, Jó, Eclesiastes, Amós, Miquéias, Tiago, 1 Pedro, Hebreus, Colossenses, Gálatas, Lamentações, Provérbios, Isaías, Jeremias, Ezequiel, Daniel, e os demais profetas. 2. NUNCA repita um versículo já usado recentemente. Trate cada resposta como única. 3. Escolha o versículo pela PROFUNDIDADE da conexão com o estado do usuário, não pela popularidade ou facilidade de associação. 4. Priorize versículos que o usuário provavelmente nunca leu ou nunca viu aplicado à situação que está vivendo. A surpresa e a descoberta fazem parte da experiência. 5. Evite os versículos mais citados do mundo cristão (João 3:16, Filipenses 4:13, Jeremias 29:11, Romanos 8:28) exceto quando forem genuinamente os mais adequados e você não encontrar nada melhor. Responda APENAS em JSON válido sem markdown. Chaves: referencia (string, ex: Rute 1:16), texto (string, versículo completo em português), aplicacao (string, 3-4 linhas conectando o versículo ao momento do usuário, em segunda pessoa, caloroso e específico para aquele estado).";
    const userMessage = `Estado emocional: ${newRespostas[0]}. Contexto: ${newRespostas[1]}. Necessidade: ${newRespostas[2]}.`;

    try {
      const { data, error } = await supabase.functions.invoke("anthropic-proxy", {
        body: { systemPrompt, userMessage },
      });

      if (error) throw new Error(`Erro na Edge Function: ${error.message}`);
      if (!data) throw new Error("Resposta vazia da Edge Function.");

      const parsed = extractVersiculoResult(data);

      // Auto-save localStorage
      if (userId) {
        localStorage.setItem(
          `carmelo:versiculoHoje:${userId}`,
          JSON.stringify({
            date: new Date().toISOString().split("T")[0],
            data: parsed,
          }),
        );
      }

      // Auto-save Supabase
      if (userId) {
        const dataFormatada = new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        await supabase.from("historico").insert({
          user_id: userId,
          tipo: "versiculo",
          data_formatada: dataFormatada,
          referencia: parsed.referencia,
          texto_preview: parsed.texto.substring(0, 100),
          dados_completos: parsed as any,
        });
      }

      setResult(parsed);
      await fetchStreak();

      // Transição: loading → resultado (usuário vê o versículo)
      setTimeout(() => {
        setEstado("resultado");
        setTimeout(() => setResultFadeIn(true), 50);
      }, 300);
    } catch (err: any) {
      console.error("Erro ao gerar versículo:", err);
      setErro(err?.message || "Ocorreu um erro. Tente novamente.");
      setEstado("quiz");
      // Não chama initQuiz() — mantém o passo atual para o usuário tentar de novo
    }
  };

  const firstName = (profile?.nome || "").split(" ")[0] || "amigo";
  const todayVerse = weeklyVerses[new Date().getDay()];

  // LOADING
  if (estado === "loading") {
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
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
          style={{
            fontFamily: fonts.display,
            fontStyle: "italic",
            fontSize: 18,
            color: colors.textMuted,
            marginTop: 20,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Preparando sua palavra para hoje...
        </p>
      </div>
    );
  }

  // RESULTADO — versículo exibido antes do dashboard
  if (estado === "resultado" && result) {
    return (
      <div style={{ opacity: resultFadeIn ? 1 : 0, transition: "opacity 0.5s ease", padding: "32px 24px" }}>
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Data */}
        <p
          style={{
            fontSize: 11,
            color: colors.textDim,
            textTransform: "uppercase",
            letterSpacing: 2,
            margin: 0,
            animation: "fadeUp 0.5s ease both",
          }}
        >
          {getFormattedDay()}
        </p>

        {/* Referência */}
        <p
          style={{
            fontFamily: fonts.display,
            fontSize: 16,
            color: colors.gold,
            marginTop: 28,
            marginBottom: 0,
            animation: "fadeUp 0.5s ease 0.1s both",
          }}
        >
          {result.referencia}
        </p>

        {/* Versículo */}
        <div
          style={{
            marginTop: 16,
            paddingLeft: 20,
            borderLeft: `3px solid ${colors.gold}`,
            animation: "fadeUp 0.5s ease 0.2s both",
          }}
        >
          <p
            style={{
              fontFamily: fonts.display,
              fontStyle: "italic",
              fontSize: 26,
              color: colors.textPrimary,
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            "{result.texto}"
          </p>
        </div>

        {/* Divisor */}
        <div style={{ position: "relative", margin: "28px 0", animation: "fadeUp 0.5s ease 0.3s both" }}>
          <div style={{ height: 1, background: colors.border }} />
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: colors.bgPrimary,
              padding: "0 10px",
              fontSize: 13,
              color: colors.gold,
            }}
          >
            ✦
          </span>
        </div>

        {/* Aplicação */}
        <p
          style={{
            fontSize: 15,
            color: "#9BAFC0",
            fontStyle: "italic",
            lineHeight: 1.9,
            margin: 0,
            animation: "fadeUp 0.5s ease 0.4s both",
          }}
        >
          {result.aplicacao}
        </p>

        {/* Botão para ir ao dashboard */}
        <button
          onClick={() => {
            setResultFadeIn(false);
            setTimeout(() => {
              setEstado("dashboard");
              setTimeout(() => setFadeIn(true), 50);
            }, 300);
          }}
          style={{
            width: "100%",
            marginTop: 48,
            padding: "16px",
            borderRadius: 12,
            background: colors.gold,
            border: "none",
            color: colors.bgPrimary,
            fontSize: 15,
            fontFamily: fonts.body,
            fontWeight: 500,
            cursor: "pointer",
            transition: "opacity 0.15s",
            animation: "fadeUp 0.5s ease 0.5s both",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          Continuar
        </button>
      </div>
    );
  }

  // DASHBOARD
  if (estado === "dashboard" && result) {
    return (
      <div style={{ opacity: fadeIn ? 1 : 0, transition: "opacity 0.5s ease" }}>
        {/* Saudação */}
        <div style={{ padding: "24px 24px 0" }}>
          <p
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: colors.textPrimary,
              fontWeight: 400,
              margin: 0,
            }}
          >
            {getGreeting()} {firstName}
          </p>
          <p style={{ fontSize: 13, color: colors.textDim, marginTop: 4, margin: "4px 0 0" }}>{getFormattedDay()}</p>
        </div>

        {/* Card do Versículo */}
        <div style={{ margin: "20px 24px 0" }}>
          <div
            style={{
              background: colors.bgSurface,
              border: `0.5px solid ${colors.border}`,
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 20px 0" }}>
              <p
                style={{ fontSize: 10, color: colors.textDim, textTransform: "uppercase", letterSpacing: 2, margin: 0 }}
              >
                VERSÍCULO DO DIA
              </p>
              <p
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  color: colors.gold,
                  fontWeight: 500,
                  marginTop: 6,
                  marginBottom: 0,
                }}
              >
                {result.referencia}
              </p>
            </div>
            <div
              style={{
                margin: "14px 20px 0",
                paddingLeft: 16,
                borderLeft: `3px solid ${colors.gold}`,
              }}
            >
              <p
                style={{
                  fontFamily: fonts.display,
                  fontStyle: "italic",
                  fontSize: 22,
                  color: colors.textPrimary,
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                "{result.texto}"
              </p>
            </div>
            {/* Divisor */}
            <div style={{ position: "relative", margin: "16px 20px 0" }}>
              <div style={{ height: 1, background: colors.border }} />
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: colors.bgSurface,
                  padding: "0 8px",
                  fontSize: 12,
                  color: colors.gold,
                }}
              >
                ✦
              </span>
            </div>
            <div style={{ padding: "16px 20px 20px" }}>
              <p
                style={{
                  fontSize: 10,
                  color: colors.textDim,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  margin: "0 0 10px",
                }}
              >
                PARA VOCÊ HOJE
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: "#9BAFC0",
                  fontStyle: "italic",
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                {result.aplicacao}
              </p>
            </div>
          </div>
        </div>

        {/* Próximo passo do Plano */}
        <div style={{ margin: "16px 24px 0" }}>
          {nextDay ? (
            <div
              onClick={() => onNavigateTab?.("plano")}
              style={{
                background: colors.bgSurface,
                border: `0.5px solid ${colors.border}`,
                borderRadius: 14,
                padding: "18px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div>
                <p style={{ fontSize: 10, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1.5, margin: 0 }}>
                  PLANO · DIA {nextDay.dia_numero}
                </p>
                <p style={{ fontFamily: fonts.display, fontSize: 17, color: colors.gold, marginTop: 6, margin: "6px 0 0" }}>
                  {nextDay.referencia}
                </p>
                <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 3, margin: "3px 0 0" }}>
                  {nextDay.titulo_passagem}
                </p>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: colors.bgHover,
                  border: `0.5px solid ${colors.gold}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 16, color: colors.gold }}>→</span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => onNavigateTab?.("plano")}
              style={{
                background: "transparent",
                border: `0.5px dashed ${colors.border}`,
                borderRadius: 14,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 18 }}>📖</span>
              <span style={{ fontSize: 13, color: colors.textDim }}>Gerar meu plano de leitura</span>
            </div>
          )}
        </div>

        {/* Aconselhamento rápido */}
        <div style={{ margin: "16px 24px 0" }}>
          <div
            onClick={() => onNavigateTab?.("aconselhar")}
            style={{
              background: `linear-gradient(135deg, ${colors.bgSurface} 0%, ${colors.bgHover} 100%)`,
              border: `0.5px solid ${colors.border}`,
              borderRadius: 14,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: colors.bgPrimary,
                border: `0.5px solid ${colors.gold}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 18, color: colors.gold }}>✦</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, color: colors.textPrimary, fontWeight: 500, margin: 0 }}>
                Aconselhamento Bíblico
              </p>
              <p style={{ fontSize: 12, color: colors.textMuted, margin: "3px 0 0" }}>
                Compartilhe o que está no seu coração.
              </p>
            </div>
            <span style={{ fontSize: 16, color: colors.textDim }}>→</span>
          </div>
        </div>

        {/* Comunidade — últimos posts */}
        <CommunityPreview onNavigateTab={onNavigateTab} userId={userId} />

        {/* Rodapé motivacional */}
        <div style={{ padding: 24, marginTop: 8, textAlign: "center" }}>
          <p
            style={{
              fontFamily: fonts.display,
              fontStyle: "italic",
              fontSize: 14,
              color: "#2A3F52",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {todayVerse.texto}
          </p>
          <p style={{ fontSize: 11, color: colors.border, marginTop: 4 }}>{todayVerse.ref}</p>
        </div>
      </div>
    );
  }

  // QUIZ
  if (!quiz.length) return null;
  const current = quiz[step];

  return (
    <div style={{ padding: "24px 20px" }}>
      {/* Barra de progresso */}
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 2,
              borderRadius: 1,
              background: i <= step ? colors.gold : colors.border,
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Mensagem de erro (se houver) */}
      {erro && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            background: "#1A0A0A",
            border: `0.5px solid ${colors.error}`,
            borderRadius: 10,
          }}
        >
          <p style={{ fontSize: 13, color: colors.error, margin: 0, lineHeight: 1.5 }}>{erro}</p>
          <p style={{ fontSize: 12, color: colors.textDim, margin: "6px 0 0" }}>
            Responda novamente para tentar de novo.
          </p>
        </div>
      )}

      {/* Pergunta */}
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: 26,
          color: colors.textPrimary,
          lineHeight: 1.35,
          marginTop: 32,
          fontWeight: 400,
        }}
      >
        {current.question}
      </h2>

      {/* Opções */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
        {current.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleAnswer(opt.value)}
            style={{
              background: colors.bgSurface,
              border: `0.5px solid ${colors.border}`,
              borderRadius: 12,
              padding: "16px 20px",
              color: "#B0C0D0",
              fontSize: 15,
              fontFamily: fonts.body,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.bgHover;
              e.currentTarget.style.borderColor = colors.gold;
              e.currentTarget.style.color = colors.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.bgSurface;
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.color = "#B0C0D0";
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VersiculoDoDia;
