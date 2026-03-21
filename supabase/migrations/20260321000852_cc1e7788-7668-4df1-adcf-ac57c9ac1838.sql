
-- Create planos_leitura table
CREATE TABLE public.planos_leitura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  titulo text NOT NULL,
  descricao text NOT NULL,
  total_dias integer NOT NULL,
  status text NOT NULL DEFAULT 'ativo',
  gerado_em timestamptz NOT NULL DEFAULT now(),
  proximo_plano_em timestamptz,
  compartilhado boolean NOT NULL DEFAULT false
);

ALTER TABLE public.planos_leitura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own planos" ON public.planos_leitura
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planos" ON public.planos_leitura
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planos" ON public.planos_leitura
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create dias_leitura table
CREATE TABLE public.dias_leitura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid REFERENCES public.planos_leitura(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  dia_numero integer NOT NULL,
  referencia text NOT NULL,
  titulo_passagem text NOT NULL,
  reflexao_ia text NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  concluido_em timestamptz
);

ALTER TABLE public.dias_leitura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own dias" ON public.dias_leitura
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dias" ON public.dias_leitura
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dias" ON public.dias_leitura
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
