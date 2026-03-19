

# Carmelo — Conselheiro Bíblico com IA

## Visão Geral
App de aconselhamento bíblico personalizado com IA (Claude/Anthropic), suporte a múltiplos usuários, painel admin, e identidade visual escura com detalhes dourados. Stack: React + TypeScript + Vite + Supabase. Estilização 100% inline (sem Tailwind/CSS modules).

---

## Backend (Supabase)

### Banco de Dados
- **profiles** — id, email, nome, role (user/admin), ativo, criado_em, ultimo_acesso
- **historico** — id, user_id, tipo (versiculo/aconselhamento), data_formatada, referencia, texto_preview, dados_completos (jsonb), criado_em
- **configuracoes** — id, anthropic_model, max_tokens, app_em_manutencao, mensagem_manutencao, atualizado_em

### RLS
- profiles: usuário lê/edita próprio; admin lê todos
- historico: usuário lê/escreve próprio; admin lê todos
- configuracoes: apenas admin lê/edita
- Função `has_role()` security definer para evitar recursão

### Edge Function: `anthropic-proxy`
- Recebe systemPrompt + userMessage, valida JWT, busca modelo/tokens de `configuracoes`, chama API Anthropic, retorna texto

---

## Fluxo & Telas

### Tela 0 — Splash
- Fundo preto, botão circular com animação de chama, texto "Toque Para Iniciar" com animação breathe
- Ao tocar: fadeOut → verifica sessão → Login ou Início

### Tela 1 — Login / Cadastro
- Abas "Entrar" / "Criar conta" com inputs estilizados na paleta escura/dourada
- Login: email + senha + "Esqueci minha senha"
- Cadastro: nome, email, senha, confirmar senha → cria profile
- Admin redirecionado para /admin

### Tela 2 — Versículo do Dia (aba Início)
- Quiz projetivo de 3 perguntas (emocional, contexto, necessidade) com variações aleatórias
- Chamada à IA via anthropic-proxy para gerar versículo personalizado
- Resultado: referência, versículo estilizado, aplicação prática
- Botões salvar (historico) e novo quiz
- Cache por dia via localStorage

### Tela 3 — Aconselhamento (aba Aconselhar)
- 3 estágios: entrada da situação → pergunta clarificadora da IA → conselho bíblico completo
- Resultado com 4 seções: reflexão, versículo principal, paralelo bíblico, aplicação prática
- Salvar no histórico

### Tela 4 — Histórico (aba Histórico)
- Lista de cards com data, tipo, referência, preview
- Expandir para ver conteúdo completo + excluir
- Estado vazio estilizado

### Tela 5 — Painel Admin (/admin)
- Métricas (4 cards: total usuários, ativos 7d, versículos, aconselhamentos)
- Gerenciamento de usuários com busca, tabela paginada, ativar/desativar
- Configurações da IA (modelo, max_tokens)
- Toggle manutenção + mensagem customizada
- Gerenciar admins (promover/remover por email)

---

## Layout Global
- Header fixo (64px) com logo "Carmelo" + avatar do usuário com dropdown
- Tab bar fixo (64px) com 3 abas: Início, Aconselhar, Histórico
- Max-width 440px centralizado, fonte Playfair Display, paleta escura/dourada
- Context API para estado global de autenticação

