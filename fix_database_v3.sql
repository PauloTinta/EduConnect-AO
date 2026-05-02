-- 🚨 FIX DATABASE RELATIONSHIPS AND RLS
-- Run this in your Supabase SQL Editor to solve join errors and infinite loops

-- 1. FIX RELATIONSHIP (PGRST200)
-- This allows the .select('*, profiles(...)') join to work automatically
DO $$ 
BEGIN
    -- Ensure profiles is linked to auth.users
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_id_fkey') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Ensure conversation_members is linked to profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'conversation_members_user_id_fkey') THEN
        ALTER TABLE public.conversation_members ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 3. CLEAN RLS (PREVENT RECURSION)
-- Drop recursive policies and use simple ones
DROP POLICY IF EXISTS "Select own memberships" ON conversation_members;
DROP POLICY IF EXISTS "Insert own membership" ON conversation_members;
DROP POLICY IF EXISTS "mem_select" ON conversation_members;
DROP POLICY IF EXISTS "mem_insert" ON conversation_members;

-- Allow users to see all members (simplifies read/write logic without recursion)
CREATE POLICY "members_read_policy" ON public.conversation_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members_insert_policy" ON public.conversation_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Conversations
DROP POLICY IF EXISTS "conv_select" ON conversations;
DROP POLICY IF EXISTS "conv_insert" ON conversations;
CREATE POLICY "conv_read_all" ON public.conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "conv_insert_own" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
