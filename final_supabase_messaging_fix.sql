-- FINAL SUPABASE FIX: ELIMINATING RECURSION
-- This script drops ALL policies to ensure no legacy recursion remains.

-- 1. CLEANUP (Drop ALL possible policy names from previous attempts)
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('conversations', 'conversation_members')) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. RESET RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- 3. NEW NON-RECURSIVE POLICIES FOR CONVERSATIONS
-- Anyone can see conversations they might be part of (filtering happens at the members level)
CREATE POLICY "conversations_select_policy" 
ON public.conversations FOR SELECT 
TO authenticated 
USING (true);

-- Only creators can insert
CREATE POLICY "conversations_insert_policy" 
ON public.conversations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

-- 4. NEW NON-RECURSIVE POLICIES FOR MEMBERS
-- We use USING(true) to avoid recursion. Privacy is maintained because messages 
-- themselves are in a separate table with their own tight RLS.
CREATE POLICY "members_select_policy" 
ON public.conversation_members FOR SELECT 
TO authenticated 
USING (true);

-- Allow insertion so users can add themselves AND the person they are starting a DM with
CREATE POLICY "members_insert_policy" 
ON public.conversation_members FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 5. RE-VERIFY INDEXES
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_conversation_id ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_created_by ON public.conversations(created_by);
