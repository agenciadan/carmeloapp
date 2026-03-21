import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fonts } from '@/styles/theme';
import { useNavigate } from 'react-router-dom';

const AdminPanel: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({ total: 0, ativos7d: 0, versiculos: 0, aconselhamentos: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(0);
  const [config, setConfig] = useState({ anthropic_model: '', max_tokens: 1000, app_em_manutencao: false, mensagem_manutencao: '' });
  const [adminEmail, setAdminEmail] = useState('');
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);

    // Metrics
    const { data: allProfiles } = await supabase.from('profiles').select('*');
    const profiles = allProfiles || [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: allHist } = await supabase.from('historico').select('tipo');
    const hist = allHist || [];

    setMetrics({
      total: profiles.length,
      ativos7d: profiles.filter((p: any) => p.ultimo_acesso && new Date(p.ultimo_acesso) > sevenDaysAgo).length,
      versiculos: hist.filter((h: any) => h.tipo === 'versiculo').length,
      aconselhamentos: hist.filter((h: any) => h.tipo === 'aconselhamento').length,
    });

    setUsers(profiles);
    setAdmins(profiles.filter((p: any) => p.role === 'admin'));

    // Config
    const { data: cfg } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
    if (cfg) setConfig({
      anthropic_model: cfg.anthropic_model,
      max_tokens: cfg.max_tokens,
      app_em_manutencao: cfg.app_em_manutencao,
      mensagem_manutencao: cfg.mensagem_manutencao || '',
    });

    setLoading(false);
  };

  const filteredUsers = users.filter((u) =>
    (u.nome || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );
  const pagedUsers = filteredUsers.slice(userPage * 20, (userPage + 1) * 20);
  const totalPages = Math.ceil(filteredUsers.length / 20);

  const toggleAtivo = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ ativo: !current }).eq('id', userId);
    loadData();
  };

  const saveConfig = async () => {
    await supabase.from('configuracoes').update({
      anthropic_model: config.anthropic_model,
      max_tokens: config.max_tokens,
      atualizado_em: new Date().toISOString(),
    }).eq('id', 1);
    alert('Configurações salvas!');
  };

  const saveManutencao = async () => {
    await supabase.from('configuracoes').update({
      app_em_manutencao: config.app_em_manutencao,
      mensagem_manutencao: config.mensagem_manutencao,
      atualizado_em: new Date().toISOString(),
    }).eq('id', 1);
    alert('Configuração de manutenção salva!');
  };

  const setRole = async (email: string, role: string) => {
    if (!confirm(`Confirma alterar o role de ${email} para ${role}?`)) return;
    await supabase.from('profiles').update({ role }).eq('email', email);
    loadData();
  };

  if (!isAdmin) {
    return <div style={{ padding: 40, textAlign: 'center', color: colors.error }}>Acesso negado</div>;
  }

  const sectionTitle: React.CSSProperties = {
    fontFamily: fonts.display, fontSize: 20, color: colors.gold, marginBottom: 16, marginTop: 40,
  };

  const cardStyle: React.CSSProperties = {
    background: colors.bgSurface, borderRadius: 14, padding: 24, textAlign: 'center',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: colors.bgSurface,
    border: `0.5px solid ${colors.border}`, borderRadius: 8, color: colors.textPrimary,
    fontSize: 14, fontFamily: fonts.body, outline: 'none', boxSizing: 'border-box',
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Carregando...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px', minHeight: '100vh', background: colors.bgPrimary }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <span style={{ color: colors.gold, fontSize: 16, marginRight: 6 }}>✦</span>
          <span style={{ fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary }}>Carmelo Admin</span>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 16px', color: colors.textMuted, cursor: 'pointer', fontSize: 13, fontFamily: fonts.body }}
        >
          ← Voltar ao app
        </button>
      </div>

      {/* Métricas */}
      <h3 style={sectionTitle}>Métricas</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { n: metrics.total, l: 'Total Usuários' },
          { n: metrics.ativos7d, l: 'Ativos (7 dias)' },
          { n: metrics.versiculos, l: 'Versículos Gerados' },
          { n: metrics.aconselhamentos, l: 'Aconselhamentos' },
        ].map((m) => (
          <div key={m.l} style={cardStyle}>
            <div style={{ fontFamily: fonts.display, fontSize: 36, color: colors.gold }}>{m.n}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{m.l}</div>
          </div>
        ))}
      </div>

      {/* Usuários */}
      <h3 style={sectionTitle}>Usuários</h3>
      <input style={{ ...inputStyle, marginBottom: 16 }} placeholder="Buscar por nome ou email..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUserPage(0); }} />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: colors.textPrimary }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              {['Nome', 'Email', 'Cadastro', 'Último acesso', 'Status', 'Ações'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: colors.textMuted, fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((u) => (
              <tr key={u.id} style={{ borderBottom: `0.5px solid ${colors.border}` }}>
                <td style={{ padding: '10px 8px' }}>{u.nome || '—'}</td>
                <td style={{ padding: '10px 8px', color: colors.textMuted }}>{u.email}</td>
                <td style={{ padding: '10px 8px', color: colors.textDim, fontSize: 12 }}>{new Date(u.criado_em).toLocaleDateString('pt-BR')}</td>
                <td style={{ padding: '10px 8px', color: colors.textDim, fontSize: 12 }}>{u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString('pt-BR') : '—'}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{
                    fontSize: 11, padding: '2px 10px', borderRadius: 20,
                    background: u.ativo ? `${colors.success}20` : `${colors.error}20`,
                    color: u.ativo ? colors.success : colors.error,
                  }}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <button
                    onClick={() => toggleAtivo(u.id, u.ativo)}
                    style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 10px', color: colors.textMuted, cursor: 'pointer', fontSize: 12 }}
                  >
                    {u.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <button disabled={userPage === 0} onClick={() => setUserPage(userPage - 1)} style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '6px 12px', color: colors.textMuted, cursor: 'pointer', fontSize: 12 }}>Anterior</button>
          <span style={{ color: colors.textDim, fontSize: 12, padding: '6px 8px' }}>{userPage + 1}/{totalPages}</span>
          <button disabled={userPage >= totalPages - 1} onClick={() => setUserPage(userPage + 1)} style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '6px 12px', color: colors.textMuted, cursor: 'pointer', fontSize: 12 }}>Próxima</button>
        </div>
      )}

      {/* Config IA */}
      <h3 style={sectionTitle}>Configurações da IA</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4, display: 'block' }}>Modelo</label>
          <input style={inputStyle} value={config.anthropic_model} onChange={(e) => setConfig({ ...config, anthropic_model: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4, display: 'block' }}>Max tokens</label>
          <input style={inputStyle} type="number" value={config.max_tokens} onChange={(e) => setConfig({ ...config, max_tokens: Number(e.target.value) })} />
        </div>
        <button onClick={saveConfig} style={{ padding: '12px', background: colors.gold, color: colors.bgPrimary, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          Salvar
        </button>
        <div style={{ background: `${colors.gold}10`, border: `1px solid ${colors.goldDim}`, borderRadius: 10, padding: 16, marginTop: 8 }}>
          <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>
            A chave da API da Anthropic é gerenciada via Supabase Dashboard → Settings → Edge Functions → Secrets → ANTHROPIC_API_KEY
          </p>
        </div>
      </div>

      {/* Manutenção */}
      <h3 style={sectionTitle}>Manutenção</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ fontSize: 14, color: colors.textPrimary }}>App em manutenção</label>
        <button
          onClick={() => setConfig({ ...config, app_em_manutencao: !config.app_em_manutencao })}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: config.app_em_manutencao ? colors.gold : colors.border,
            position: 'relative',
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 3,
            left: config.app_em_manutencao ? 23 : 3,
            transition: 'left 0.15s ease',
          }} />
        </button>
      </div>
      <textarea
        style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
        placeholder="Mensagem para os usuários..."
        value={config.mensagem_manutencao}
        onChange={(e) => setConfig({ ...config, mensagem_manutencao: e.target.value })}
      />
      <button onClick={saveManutencao} style={{ marginTop: 12, padding: '12px', background: colors.gold, color: colors.bgPrimary, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, width: '100%' }}>
        Salvar manutenção
      </button>

      {/* Gerenciar Admins */}
      <h3 style={sectionTitle}>Gerenciar Admins</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="Email do usuário" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
        <button onClick={() => setRole(adminEmail, 'admin')} style={{ padding: '10px 14px', background: colors.gold, color: colors.bgPrimary, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
          Tornar admin
        </button>
        <button onClick={() => setRole(adminEmail, 'user')} style={{ padding: '10px 14px', background: 'transparent', border: `1px solid ${colors.error}`, color: colors.error, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
          Remover admin
        </button>
      </div>
      <div style={{ fontSize: 13, color: colors.textMuted }}>
        <p style={{ marginBottom: 8, fontWeight: 600 }}>Admins atuais:</p>
        {admins.map((a) => (
          <div key={a.id} style={{ padding: '6px 0', borderBottom: `0.5px solid ${colors.border}` }}>
            {a.nome || '—'} — <span style={{ color: colors.textDim }}>{a.email}</span>
          </div>
        ))}
      </div>

      <div style={{ height: 60 }} />
    </div>
  );
};

export default AdminPanel;
