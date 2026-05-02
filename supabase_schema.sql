-- 1. Tabela de Perfis (Profiles)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  country TEXT DEFAULT 'Angola',
  city TEXT,
  education_level TEXT,
  interests TEXT[], -- Array de interesses
  goal TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Logs de XP (XP Logs)
CREATE TABLE public.xp_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- Ex: 'completed_lesson', 'daily_login'
  xp_earned INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Conquistas (Achievements)
CREATE TABLE public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nome do ícone da Lucide ou URL
  xp_bonus INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Conquistas do Utilizador (User Achievements)
CREATE TABLE public.user_achievements (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);

-- 5. Configurar Row Level Security (RLS)

-- Perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utilizadores podem ver todos os perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Utilizadores podem editar o seu próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- XP Logs
ALTER TABLE public.xp_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utilizadores podem ver seus próprios logs" ON public.xp_logs FOR SELECT USING (auth.uid() = user_id);
-- Permitir que o sistema insira XP (nesta demo, permitimos que o utilizador insira via client)
CREATE POLICY "Utilizadores podem inserir logs de XP" ON public.xp_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de conquistas" ON public.achievements FOR SELECT USING (true);

-- User Achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utilizadores podem ver suas conquistas desbloqueadas" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- 6. Gatilho para criar perfil automaticamente no SignUp (Opcional, pois fazemos no Onboarding)
-- No EduConnect, como temos Onboarding manual, não precisamos obrigatoriamente de um Trigger
-- Mas é bom ter um padrão básico.
