import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fonts } from '@/styles/theme';

interface AconselhamentoResult {
  reflexao: string;
  versiculoPrincipal: { referencia: string; texto: string; contextoNarrativo: string };
  paraleloBiblico: { personagem: string; historia: string };
  aplicacaoPratica: string;
}

const Aconselhamento: React.FC = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [stage, setStage] = useState<'entrada' | 'clarificando' | 'loading' | 'resultado'>('entrada');
  const [situacao, setSituacao] = useState('');
  const [perguntaIA, setPerguntaIA] = useState('');
  const [resposta, setResposta] = useState('');
  const [result, setResult] = useState<AconselhamentoResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const textareaStyle: React.CSSProperties = {
    width: '100%', minHeight: 120, padding: '14px 16px', background: colors.bgSurface,
    border: `0.5px solid ${colors.border}`, borderRadius: 12, color: colors.textPrimary,
    fontSize: 15, fontFamily: fonts.body, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
  };

  const btnGold: React.CSSProperties = {
    width: '100%', padding: '14px', background: colors.gold, color: colors.bgPrimary,
    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
    fontFamily: fonts.body, marginTop: 16,
  };

  const handleContinue = async () => {
    if (!situacao.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
        body: {
          systemPrompt: 'Faça 1 pergunta curta e empática para entender melhor a situação do usuário. Responda APENAS em JSON válido sem markdown. Chave: pergunta',
          userMessage: situacao,
        },
      });
      if (error) throw error;
      const parsed = JSON.parse(data.text);
      setPerguntaIA(parsed.pergunta);
      setStage('clarificando');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscarConselho = async () => {
    if (!resposta.trim()) return;
    setStage('loading');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
        body: {
          systemPrompt: 'Você é um conselheiro bíblico profundo e empático. Responda APENAS em JSON válido sem markdown. Chaves: reflexao (string), versiculoPrincipal (objeto com referencia, texto, contextoNarrativo), paraleloBiblico (objeto com personagem, historia), aplicacaoPratica (string).',
          userMessage: `Situação original: ${situacao}\n\nPergunta da IA: ${perguntaIA}\nResposta do usuário: ${resposta}`,
        },
      });
      if (error) throw error;
      const parsed: AconselhamentoResult = JSON.parse(data.text);
      setResult(parsed);
      setStage('resultado');
    } catch (err) {
      console.error(err);
      setStage('clarificando');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !result) return;
    const today = new Date();
    await supabase.from('historico').insert({
      user_id: userId,
      tipo: 'aconselhamento',
      data_formatada: today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      referencia: result.versiculoPrincipal.referencia,
      texto_preview: result.reflexao.substring(0, 100),
      dados_completos: result as any,
    });
    setSaved(true);
  };

  const reset = () => {
    setSituacao('');
    setPerguntaIA('');
    setResposta('');
    setResult(null);
    setSaved(false);
    setStage('entrada');
  };

  if (stage === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 24 }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 32, height: 32, border: `2px solid ${colors.border}`, borderTop: `2px solid ${colors.gold}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 18, color: colors.textMuted, marginTop: 20, textAlign: 'center' }}>
          Buscando conselho bíblico...
        </p>
      </div>
    );
  }

  if (stage === 'resultado' && result) {
    return (
      <div style={{ padding: '24px 20px' }}>
        {/* Reflexão */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, color: colors.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>♡ REFLEXÃO</p>
          <p style={{ fontSize: 15, color: '#9BAFC0', fontStyle: 'italic', lineHeight: 1.9 }}>{result.reflexao}</p>
        </div>

        {/* Versículo */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, color: colors.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>✦ A PALAVRA PARA VOCÊ</p>
          <p style={{ fontFamily: fonts.display, fontSize: 15, color: colors.gold }}>{result.versiculoPrincipal.referencia}</p>
          <p style={{
            fontFamily: fonts.display, fontStyle: 'italic', fontSize: 22, color: colors.textPrimary,
            borderLeft: `2px solid ${colors.gold}`, paddingLeft: 20, marginTop: 12, lineHeight: 1.5,
          }}>
            {result.versiculoPrincipal.texto}
          </p>
          <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 12, lineHeight: 1.7 }}>
            {result.versiculoPrincipal.contextoNarrativo}
          </p>
        </div>

        {/* Paralelo bíblico */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, color: colors.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>◎ QUEM JÁ VIVEU ISSO</p>
          <div style={{ background: colors.bgSurface, borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontFamily: fonts.display, fontSize: 16, color: colors.gold, marginBottom: 8 }}>{result.paraleloBiblico.personagem}</p>
            <p style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.7 }}>{result.paraleloBiblico.historia}</p>
          </div>
        </div>

        {/* Aplicação */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: colors.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>→ COMO APLICAR HOJE</p>
          <p style={{ fontSize: 15, color: '#9BAFC0', lineHeight: 1.9 }}>{result.aplicacaoPratica}</p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleSave} disabled={saved} style={{
            flex: 1, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: saved ? colors.bgSurface : colors.gold,
            color: saved ? colors.textMuted : colors.bgPrimary,
            fontSize: 14, fontWeight: 600, fontFamily: fonts.body,
          }}>
            {saved ? '✓ Salvo' : '♡ Salvar'}
          </button>
          <button onClick={reset} style={{
            flex: 1, padding: '14px', borderRadius: 10, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${colors.gold}`,
            color: colors.gold, fontSize: 14, fontWeight: 600, fontFamily: fonts.body,
          }}>
            Nova consulta
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'clarificando') {
    return (
      <div style={{ padding: '24px 20px' }}>
        <p style={{ fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, lineHeight: 1.4, marginBottom: 20 }}>
          {perguntaIA}
        </p>
        <textarea style={textareaStyle} placeholder="Sua resposta..." value={resposta} onChange={(e) => setResposta(e.target.value)} />
        <button style={btnGold} onClick={handleBuscarConselho} disabled={loading}>
          {loading ? '...' : 'Buscar conselho bíblico'}
        </button>
      </div>
    );
  }

  // Entrada
  return (
    <div style={{ padding: '24px 20px' }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary, lineHeight: 1.35, marginBottom: 8, fontWeight: 400 }}>
        O que está no seu coração?
      </h2>
      <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: 24, lineHeight: 1.6 }}>
        Descreva a situação que você está vivendo. A IA vai te ajudar a encontrar sabedoria bíblica.
      </p>
      <textarea style={textareaStyle} placeholder="Conte o que está acontecendo..." value={situacao} onChange={(e) => setSituacao(e.target.value)} />
      <button style={btnGold} onClick={handleContinue} disabled={loading}>
        {loading ? '...' : 'Continuar'}
      </button>
    </div>
  );
};

export default Aconselhamento;
