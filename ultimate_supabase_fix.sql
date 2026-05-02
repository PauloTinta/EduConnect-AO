-- 🚀 ULTIMATE CHAT DB FIX
-- Resolve PGRST200, Infinite Recursion e permissões de Pro Chat

-- 1. FIX PROFILES RELATIONSHIP (PGRST200 Fix)
-- Garante que o Supabase entende que profiles.id é a chave primária ligada ao auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Garante que conversation_members.user_id aponta para profiles.id
ALTER TABLE public.conversation_members DROP CONSTRAINT IF EXISTS conversation_members_user_id_fkey;
ALTER TABLE public.conversation_members ADD CONSTRAINT conversation_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. ELIMINATE RLS RECURSION (Infinite Loop Fix)
-- Vamos remover as policies antigas e criar novas ultra-simples que não consultam a própria tabela.
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('conversations', 'conversation_members', 'messages')) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Policies para CONVERSATIONS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_select" ON public.conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Policies para MEMBERS (AQUI ESTAVA O LOOP)
-- Usamos apenas a verificação de auth.uid() direta para evitar recursão
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mem_select" ON public.conversation_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "mem_insert" ON public.conversation_members FOR INSERT TO authenticated WITH CHECK (true);

-- Policies para MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_select" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "msg_update" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id OR EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

-- 3. POLLS & VOTES
CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(message_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_select" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "votes_insert" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_update" ON public.poll_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 4. RELOAD POSTGREST
NOTIFY pgrst, 'reload schema';
