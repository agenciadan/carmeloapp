
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nome TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_acesso TIMESTAMPTZ
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Historico table
CREATE TABLE public.historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  data_formatada TEXT,
  referencia TEXT,
  texto_preview TEXT,
  dados_completos JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;

-- Configuracoes table
CREATE TABLE public.configuracoes (
  id INTEGER PRIMARY KEY DEFAULT 1,
  anthropic_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  max_tokens INTEGER NOT NULL DEFAULT 1000,
  app_em_manutencao BOOLEAN NOT NULL DEFAULT false,
  mensagem_manutencao TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Insert default config row
INSERT INTO public.configuracoes (id) VALUES (1);

-- Security definer function to check role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for historico
CREATE POLICY "Users can read own historico"
  ON public.historico FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all historico"
  ON public.historico FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own historico"
  ON public.historico FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own historico"
  ON public.historico FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for configuracoes
CREATE POLICY "Admins can read configuracoes"
  ON public.configuracoes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update configuracoes"
  ON public.configuracoes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow any authenticated user to read maintenance status
CREATE POLICY "Authenticated users can read maintenance status"
  ON public.configuracoes FOR SELECT
  TO authenticated
  USING (true);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
