
-- Create posts_comunidade table
CREATE TABLE public.posts_comunidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL,
  conteudo text NOT NULL,
  referencia_biblica text,
  nome_usuario text NOT NULL,
  visivel boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.posts_comunidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read visible posts" ON public.posts_comunidade
  FOR SELECT TO authenticated USING (visivel = true);

CREATE POLICY "Admins can read all posts" ON public.posts_comunidade
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own posts" ON public.posts_comunidade
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.posts_comunidade
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.posts_comunidade
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all posts" ON public.posts_comunidade
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create reacoes_posts table
CREATE TABLE public.reacoes_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts_comunidade(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, tipo)
);

ALTER TABLE public.reacoes_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read reactions" ON public.reacoes_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own reactions" ON public.reacoes_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions" ON public.reacoes_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
