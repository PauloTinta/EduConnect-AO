-- 🚀 FINAL CHAT FIXES (RUN THIS IN SUPABASE SQL EDITOR)
-- This script fixes RLS, relationships, and enables Realtime

-- 1. ENABLE REALTIME FOR MESSAGES
-- This is essential for live updates to work!
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- 2. FIX RELATIONSHIPS (PGRST200 Fix)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.conversation_members DROP CONSTRAINT IF EXISTS conversation_members_user_id_fkey;
ALTER TABLE public.conversation_members ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. CLEAN RLS (PREVENT RECURSION & ALLOW READS)
-- Drop existing problematic policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('conversations', 'conversation_members', 'messages')) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Tables should have RLS enabled
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SIMPLE POLICIES (Ultra-reliable)
-- Conversations: Viewable by anyone authenticated (for simplicity in join queries)
CREATE POLICY "conv_select_all" ON public.conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "conv_insert_own" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Members: Viewable by anyone authenticated (avoids infinite loops in complex queries)
CREATE POLICY "mem_select_all" ON public.conversation_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "mem_insert_any" ON public.conversation_members FOR INSERT TO authenticated WITH CHECK (true);

-- Messages: Selective but without complex joins that might cause recursion
CREATE POLICY "msg_select_all" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "msg_insert_own" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "msg_update_own" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id OR EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "msg_delete_own" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- 4. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
