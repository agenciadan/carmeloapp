import React, { useState, useEffect } from 'react';
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

const VersiculoDoDia: React.FC = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [quiz, setQuiz] = useState<QuizVariation[]>([]);
  const [step, setStep] = useState(0);
  const [respostas, setRespostas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VersiculoResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [estado, setEstado] = useState<'quiz' | 'loading' | 'result'>('quiz');

  useEffect(() => {
    if (!userId) return;
    const cacheKey = `carmelo:versiculoHoje:${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.date === new Date().toISOString().split('T')[0]) {
          setResult(parsed.data);
          setEstado('result');
          return;
        }
      } catch { /* ignore */ }
    }
    initQuiz();
  }, [userId]);

  const initQuiz = () => {
    setQuiz([
      pickRandom(emocionalVariations),
      pickRandom(contextoVariations),
      pickRandom(necessidadeVariations),
    ]);
    setStep(0);
    setRespostas([]);
    setResult(null);
    setSaved(false);
    setEstado('quiz');
  };

  const handleAnswer = async (value: string) => {
    const newRespostas = [...respostas, value];
    setRespostas(newRespostas);

    if (newRespostas.length < 3) {
      setStep(step + 1);
      return;
    }

    // All 3 answered — call API
    setEstado('loading');
    setLoading(true);

    const systemPrompt = 'Você é um conselheiro bíblico sábio e empático. Selecione UM versículo genuinamente relevante. Responda APENAS em JSON válido sem markdown. Chaves: referencia, texto, aplicacao.';
    const userMessage = `Estado emocional: ${newRespostas[0]}. Contexto: ${newRespostas[1]}. Necessidade: ${newRespostas[2]}.`;

    try {
      const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
        body: { systemPrompt, userMessage },
      });

      if (error) throw error;

      const parsed: VersiculoResult = JSON.parse(data.text);
      setResult(parsed);
      setEstado('result');

      // Cache
      if (userId) {
        localStorage.setItem(`carmelo:versiculoHoje:${userId}`, JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          data: parsed,
        }));
      }
    } catch (err) {
      console.error(err);
      setEstado('quiz');
      initQuiz();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !result) return;
    const today = new Date();
    const dataFormatada = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    await supabase.from('historico').insert({
      user_id: userId,
      tipo: 'versiculo',
      data_formatada: dataFormatada,
      referencia: result.referencia,
      texto_preview: result.texto.substring(0, 100),
      dados_completos: result as any,
    });
    setSaved(true);
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
  };

  if (estado === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 24 }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 32, height: 32, border: `2px solid ${colors.border}`, borderTop: `2px solid ${colors.gold}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 18, color: colors.textMuted, marginTop: 20, textAlign: 'center' }}>
          Buscando sua palavra para hoje...
        </p>
      </div>
    );
  }

  if (estado === 'result' && result) {
    return (
      <div style={{ padding: '24px 20px' }}>
        <p style={{ fontSize: 11, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2 }}>{formatDate()}</p>
        <p style={{ fontFamily: fonts.display, fontSize: 15, color: colors.gold, marginTop: 28 }}>{result.referencia}</p>
        <p style={{
          fontFamily: fonts.display, fontStyle: 'italic', fontSize: 24, color: colors.textPrimary,
          borderLeft: `2px solid ${colors.gold}`, paddingLeft: 20, marginTop: 16, lineHeight: 1.5,
        }}>
          {result.texto}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
          <div style={{ flex: 1, height: 0.5, background: colors.border }} />
          <span style={{ color: colors.gold, fontSize: 12 }}>✦</span>
          <div style={{ flex: 1, height: 0.5, background: colors.border }} />
        </div>

        <p style={{ fontSize: 15, color: '#9BAFC0', fontStyle: 'italic', lineHeight: 1.9 }}>{result.aplicacao}</p>

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            onClick={handleSave}
            disabled={saved}
            style={{
              flex: 1, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: saved ? colors.bgSurface : colors.gold,
              color: saved ? colors.textMuted : colors.bgPrimary,
              fontSize: 14, fontWeight: 600, fontFamily: fonts.body,
            }}
          >
            {saved ? '✓ Salvo' : '♡ Salvar'}
          </button>
          <button
            onClick={() => {
              if (userId) localStorage.removeItem(`carmelo:versiculoHoje:${userId}`);
              initQuiz();
            }}
            style={{
              flex: 1, padding: '14px', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${colors.gold}`,
              color: colors.gold, fontSize: 14, fontWeight: 600, fontFamily: fonts.body,
            }}
          >
            Novo quiz
          </button>
        </div>
      </div>
    );
  }

  // Quiz state
  if (!quiz.length) return null;
  const current = quiz[step];

  return (
    <div style={{ padding: '24px 20px' }}>
      {/* Progress bar */}
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
