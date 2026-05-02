-- 🚨 THE ULTIMATE RLS FIX
-- Este script resolve "new row violates row-level security policy" unificando todas as permissões.

-- 1. LIMPEZA TOTAL DE POLICIES ANTIGAS
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'conversations', 'conversation_members', 'messages', 'poll_votes', 'posts', 'comments', 'post_likes')
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 3. CONVERSATIONS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_select" ON public.conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- 4. CONVERSATION_MEMBERS
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mem_select" ON public.conversation_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "mem_insert" ON public.conversation_members FOR INSERT TO authenticated WITH CHECK (true); -- Permite adicionar o outro participante
CREATE POLICY "mem_delete" ON public.conversation_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_select" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
-- Permite que o autor edite ou que qualquer membro da conversa marque como "lida" (update seen_at)
CREATE POLICY "msg_update" ON public.messages FOR UPDATE TO authenticated 
USING (
    auth.uid() = sender_id 
    OR EXISTS (
        SELECT 1 FROM public.conversation_members 
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
)
WITH CHECK (
    auth.uid() = sender_id 
    OR EXISTS (
        SELECT 1 FROM public.conversation_members 
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);
CREATE POLICY "msg_delete" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- 6. POLL_VOTES
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_select" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "votes_insert" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_update" ON public.poll_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete" ON public.poll_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. SOCIAL (POSTS, COMMENTS, LIKES)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_select" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "posts_delete" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_insert" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 8. REFRESH
NOTIFY pgrst, 'reload schema';
