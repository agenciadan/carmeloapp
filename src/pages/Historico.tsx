import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fonts } from '@/styles/theme';

interface HistoricoItem {
  id: string;
  tipo: string;
  data_formatada: string | null;
  referencia: string | null;
  texto_preview: string | null;
  dados_completos: any;
  criado_em: string;
}

const Historico: React.FC = () => {
  const { session } = useAuth();
  const [items, setItems] = useState<HistoricoItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('historico')
      .select('*')
      .order('criado_em', { ascending: false });
    setItems((data || []) as HistoricoItem[]);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [session?.user?.id]);

  const handleDelete = async (id: string) => {
    await supabase.from('historico').delete().eq('id', id);
    setItems(items.filter((i) => i.id !== id));
    setExpanded(null);
  };

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: colors.textMuted }}>Carregando...</div>;
  }

  if (!items.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 24 }}>
        <span style={{ fontSize: 48, opacity: 0.15, color: colors.gold }}>✦</span>
        <p style={{ fontFamily: fonts.display, fontSize: 18, color: colors.textDim, marginTop: 16 }}>
          Sua jornada começa aqui.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      {items.map((item) => {
        const isExpanded = expanded === item.id;
        const dados = item.dados_completos;
        return (
          <div key={item.id} style={{ marginBottom: 12 }}>
            <button
              onClick={() => setExpanded(isExpanded ? null : item.id)}
              style={{
                width: '100%', background: colors.bgSurface, border: `0.5px solid ${colors.border}`,
                borderRadius: 12, padding: '16px 20px', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: colors.textDim }}>{item.data_formatada}</span>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 20,
                  background: item.tipo === 'versiculo' ? colors.goldDim : `${colors.gold}15`,
                  color: colors.gold, textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  {item.tipo === 'versiculo' ? 'Versículo' : 'Aconselhamento'}
                </span>
              </div>
              {item.referencia && (
                <p style={{ fontFamily: fonts.display, fontSize: 14, color: colors.gold, margin: 0 }}>{item.referencia}</p>
              )}
              <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 0', lineHeight: 1.5 }}>
                {item.texto_preview}
              </p>
            </button>

            {isExpanded && dados && (
              <div style={{ background: colors.bgSurface, borderRadius: '0 0 12px 12px', padding: '16px 20px', borderTop: `0.5px solid ${colors.border}`, marginTop: -4 }}>
                {item.tipo === 'versiculo' && (
                  <>
                    <p style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 18, color: colors.textPrimary, borderLeft: `2px solid ${colors.gold}`, paddingLeft: 16, lineHeight: 1.5 }}>
                      {dados.texto}
                    </p>
                    <p style={{ fontSize: 14, color: '#9BAFC0', fontStyle: 'italic', marginTop: 16, lineHeight: 1.8 }}>{dados.aplicacao}</p>
                  </>
                )}
                {item.tipo === 'aconselhamento' && (
                  <>
                    <p style={{ fontSize: 14, color: '#9BAFC0', fontStyle: 'italic', lineHeight: 1.8 }}>{dados.reflexao}</p>
                    {dados.versiculoPrincipal && (
                      <div style={{ marginTop: 16 }}>
                        <p style={{ fontFamily: fonts.display, fontSize: 14, color: colors.gold }}>{dados.versiculoPrincipal.referencia}</p>
                        <p style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 18, color: colors.textPrimary, borderLeft: `2px solid ${colors.gold}`, paddingLeft: 16, marginTop: 8, lineHeight: 1.5 }}>
                          {dados.versiculoPrincipal.texto}
                        </p>
                      </div>
                    )}
                    {dados.aplicacaoPratica && (
                      <p style={{ fontSize: 14, color: '#9BAFC0', marginTop: 16, lineHeight: 1.8 }}>{dados.aplicacaoPratica}</p>
                    )}
                  </>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{
                    marginTop: 16, padding: '10px 16px', background: 'transparent',
                    border: `1px solid ${colors.error}`, borderRadius: 8, color: colors.error,
                    fontSize: 13, cursor: 'pointer', fontFamily: fonts.body,
                  }}
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Historico;
