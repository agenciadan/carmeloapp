import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fonts } from '@/styles/theme';
import {
  emocionalVariations, contextoVariations, necessidadeVariations,
  pickRandom, QuizVariation,
} from '@/data/quizQuestions';

interface VersiculoResult {
  referencia: string;
  texto: string;
  aplicacao: string;
}

interface VersiculoDoDiaProps {
  onNavigateTab?: (tab: string) => void;
}

const weeklyVerses = [
  { texto: '"O SENHOR é o meu pastor; nada me faltará."', ref: 'Salmos 23:1' },
  { texto: '"Tudo posso naquele que me fortalece."', ref: 'Filipenses 4:13' },
  { texto: '"Porque eu, o SENHOR teu Deus, te sustento pela mão direita."', ref: 'Isaías 41:13' },
  { texto: '"Entrega o teu caminho ao SENHOR; confia nele, e ele tudo fará."', ref: 'Salmos 37:5' },
  { texto: '"A paz de Deus, que excede todo o entendimento, guardará os vossos corações."', ref: 'Filipenses 4:7' },
  { texto: '"Sede fortes e corajosos. Não temais."', ref: 'Deuteronômio 31:6' },
  { texto: '"Esta é a vitória que vence o mundo: a nossa fé."', ref: '1 João 5:4' },
];

const calcStreak = (dates: string[]): number => {
  if (!dates.length) return 0;
  const unique = [...new Set(dates.map(d => d.split('T')[0]))].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
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
  if (h >= 5 && h < 12) return 'Bom dia,';
  if (h >= 12 && h < 18) return 'Boa tarde,';
  return 'Boa noite,';
};

const getFormattedDay = (): string => {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  }).replace(/^\w/, c => c.toUpperCase());
};

const VersiculoDoDia: React.FC<VersiculoDoDiaProps> = ({ onNavigateTab }) => {
  const { session, profile } = useAuth();
  const userId = session?.user?.id;

  const [quiz, setQuiz] = useState<QuizVariation[]>([]);
  const [step, setStep] = useState(0);
  const [respostas, setRespostas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VersiculoResult | null>(null);
  const [estado, setEstado] = useState<'quiz' | 'loading' | 'dashboard'>('quiz');
  const [streak, setStreak] = useState(0);
  const [fadeIn, setFadeIn] = useState(false);

  const fetchStreak = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('historico')
      .select('criado_em')
      .eq('user_id', userId);
    if (data) setStreak(calcStreak(data.map(d => d.criado_em)));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const cacheKey = `carmelo:versiculoHoje:${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.date === new Date().toISOString().split('T')[0]) {
          setResult(parsed.data);
          setEstado('dashboard');
          setFadeIn(true);
          fetchStreak();
          return;
        }
      } catch { /* ignore */ }
    }
    initQuiz();
    fetchStreak();
  }, [userId, fetchStreak]);

  const initQuiz = () => {
    setQuiz([
      pickRandom(emocionalVariations),
      pickRandom(contextoVariations),
      pickRandom(necessidadeVariations),
    ]);
    setStep(0);
    setRespostas([]);
    setResult(null);
    setEstado('quiz');
  };

  const handleAnswer = async (value: string) => {
    const newRespostas = [...respostas, value];
    setRespostas(newRespostas);

    if (newRespostas.length < 3) {
      setStep(step + 1);
      return;
    }

    setEstado('loading');
    setLoading(true);

    const systemPrompt = 'Você é um conselheiro bíblico sábio com conhecimento profundo de toda a Bíblia Sagrada. Sua tarefa é selecionar UM versículo genuinamente relevante para o momento do usuário. REGRAS OBRIGATÓRIAS: 1. Explore toda a Bíblia — Antigo e Novo Testamento têm igual valor. Não fique preso em livros populares como Filipenses, Salmos ou João. Considere ativamente livros menos explorados: Rute, Ester, Habacuque, Jó, Eclesiastes, Amós, Miquéias, Tiago, 1 Pedro, Hebreus, Colossenses, Gálatas, Lamentações, Provérbios, Isaías, Jeremias, Ezequiel, Daniel, e os demais profetas. 2. NUNCA repita um versículo já usado recentemente. Trate cada resposta como única. 3. Escolha o versículo pela PROFUNDIDADE da conexão com o estado do usuário, não pela popularidade ou facilidade de associação. 4. Priorize versículos que o usuário provavelmente nunca leu ou nunca viu aplicado à situação que está vivendo. A surpresa e a descoberta fazem parte da experiência. 5. Evite os versículos mais citados do mundo cristão (João 3:16, Filipenses 4:13, Jeremias 29:11, Romanos 8:28) exceto quando forem genuinamente os mais adequados e você não encontrar nada melhor. Responda APENAS em JSON válido sem markdown. Chaves: referencia (string, ex: Rute 1:16), texto (string, versículo completo em português), aplicacao (string, 3-4 linhas conectando o versículo ao momento do usuário, em segunda pessoa, caloroso e específico para aquele estado).';
    const userMessage = `Estado emocional: ${newRespostas[0]}. Contexto: ${newRespostas[1]}. Necessidade: ${newRespostas[2]}.`;

    try {
      const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
        body: { systemPrompt, userMessage },
      });

      if (error) throw error;

      const parsed: VersiculoResult = JSON.parse(data.text);
      setResult(parsed);

      // Auto-save to localStorage
      if (userId) {
        localStorage.setItem(`carmelo:versiculoHoje:${userId}`, JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          data: parsed,
        }));
      }

      // Auto-save to historico
      if (userId) {
        const today = new Date();
        const dataFormatada = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        await supabase.from('historico').insert({
          user_id: userId,
          tipo: 'versiculo',
          data_formatada: dataFormatada,
          referencia: parsed.referencia,
          texto_preview: parsed.texto.substring(0, 100),
          dados_completos: parsed as any,
        });
      }

      // Transition to dashboard
      setLoading(false);
      setTimeout(() => {
        setEstado('dashboard');
        setTimeout(() => setFadeIn(true), 50);
      }, 300);
      await fetchStreak();
    } catch (err) {
      console.error(err);
      setEstado('quiz');
      initQuiz();
      setLoading(false);
    }
  };

  const firstName = (profile?.nome || '').split(' ')[0] || 'amigo';
  const todayVerse = weeklyVerses[new Date().getDay()];

  // LOADING STATE
  if (estado === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 24 }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 32, height: 32, border: `2px solid ${colors.border}`, borderTop: `2px solid ${colors.gold}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 18, color: colors.textMuted, marginTop: 20, textAlign: 'center' }}>
          Preparando sua palavra para hoje...
        </p>
      </div>
    );
  }

  // DASHBOARD STATE
  if (estado === 'dashboard' && result) {
    return (
      <div style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        {/* Seção 1 — Saudação */}
        <div style={{ padding: '24px 24px 0' }}>
          <p style={{ fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, fontWeight: 400, margin: 0 }}>
            {getGreeting()} {firstName}
          </p>
          <p style={{ fontSize: 13, color: colors.textDim, marginTop: 4 }}>{getFormattedDay()}</p>
        </div>

        {/* Seção 2 — Card do Versículo */}
        <div style={{ margin: '20px 24px 0' }}>
          <div style={{ background: colors.bgSurface, border: `0.5px solid ${colors.border}`, borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '20px 20px 0' }}>
              <p style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>VERSÍCULO DO DIA</p>
              <p style={{ fontFamily: fonts.display, fontSize: 20, color: colors.gold, fontWeight: 500, marginTop: 6, marginBottom: 0 }}>{result.referencia}</p>
            </div>
            <div style={{ padding: '14px 20px', borderLeft: `3px solid ${colors.gold}`, marginLeft: 20, marginRight: 20 }}>
              <p style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 22, color: colors.textPrimary, lineHeight: 1.55, margin: 0 }}>
                "{result.texto}"
              </p>
            </div>
            {/* Divisor */}
            <div style={{ position: 'relative', margin: '0 20px' }}>
              <div style={{ height: 0.5, background: colors.border }} />
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: colors.bgSurface, padding: '0 8px', fontSize: 12, color: colors.gold }}>✦</span>
            </div>
            <div style={{ padding: '16px 20px 20px' }}>
              <p style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, margin: 0, marginBottom: 10 }}>PARA VOCÊ HOJE</p>
              <p style={{ fontSize: 14, color: '#9BAFC0', fontStyle: 'italic', lineHeight: 1.8, margin: 0 }}>{result.aplicacao}</p>
            </div>
          </div>
        </div>

        {/* Seção 3 — Próximo passo do Plano (placeholder) */}
        <div style={{ margin: '16px 24px 0' }}>
          <div
            onClick={() => onNavigateTab?.('plano')}
            style={{
              background: 'transparent', border: `0.5px dashed ${colors.border}`, borderRadius: 14,
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 18, color: colors.textDim }}>📖</span>
            <span style={{ fontSize: 13, color: colors.textDim }}>Gerar meu plano de leitura</span>
          </div>
        </div>

        {/* Seção 4 — Acesso rápido Aconselhamento */}
        <div style={{ margin: '16px 24px 0' }}>
          <div
            onClick={() => onNavigateTab?.('aconselhar')}
            style={{
              background: `linear-gradient(135deg, ${colors.bgSurface} 0%, ${colors.bgHover} 100%)`,
              border: `0.5px solid ${colors.border}`, borderRadius: 14, padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: colors.bgPrimary,
              border: `0.5px solid ${colors.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 18, color: colors.gold }}>✦</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, color: colors.textPrimary, fontWeight: 500, margin: 0 }}>Aconselhamento Bíblico</p>
              <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 3, margin: 0 }}>Compartilhe o que está no seu coração.</p>
            </div>
            <span style={{ fontSize: 16, color: colors.textDim }}>→</span>
          </div>
        </div>

        {/* Seção 5 — Comunidade (em breve) */}
        <div style={{ margin: '24px 24px 0' }}>
          <p style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>COMUNIDADE</p>
          <div style={{
            background: colors.bgSurface, border: `0.5px dashed ${colors.border}`, borderRadius: 14,
            padding: 24, textAlign: 'center',
          }}>
            <span style={{ fontSize: 32, opacity: 0.4, display: 'block', marginBottom: 12 }}>🕊</span>
            <p style={{ fontFamily: fonts.display, fontSize: 17, color: colors.textDim, margin: 0 }}>A Comunidade está chegando</p>
            <p style={{ fontSize: 13, color: '#2A3F52', marginTop: 8, lineHeight: 1.6 }}>
              Em breve você poderá compartilhar versículos, reflexões e pedidos de oração.
            </p>
          </div>
        </div>

        {/* Seção 6 — Rodapé motivacional */}
        <div style={{ padding: 24, marginTop: 8, textAlign: 'center' }}>
          <p style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 14, color: '#2A3F52', lineHeight: 1.6, margin: 0 }}>
            {todayVerse.texto}
          </p>
          <p style={{ fontSize: 11, color: colors.border, marginTop: 4 }}>{todayVerse.ref}</p>
        </div>
      </div>
    );
  }

  // QUIZ STATE
  if (!quiz.length) return null;
  const current = quiz[step];

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1, height: 2, borderRadius: 1, background: i <= step ? colors.gold : colors.border }} />
        ))}
      </div>

      <h2 style={{
        fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary,
        lineHeight: 1.35, marginTop: 32, fontWeight: 400,
      }}>
        {current.question}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28 }}>
        {current.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleAnswer(opt.value)}
            style={{
              background: colors.bgSurface, border: `0.5px solid ${colors.border}`,
              borderRadius: 12, padding: '16px 20px', color: '#B0C0D0',
              fontSize: 15, fontFamily: fonts.body, cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.bgHover;
              e.currentTarget.style.borderColor = colors.gold;
              e.currentTarget.style.color = colors.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.bgSurface;
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.color = '#B0C0D0';
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
