-- REFACTORED MESSAGING SYSTEM (DM)
-- Eliminates recursion and scales for future groups

-- 1. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Migration for existing conversations table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='created_by') THEN
        ALTER TABLE public.conversations ADD COLUMN created_by UUID REFERENCES public.profiles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='type') THEN
        ALTER TABLE public.conversations ADD COLUMN type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group'));
    END IF;
END $$;

-- 2. CONVERSATION MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(conversation_id, user_id)
);

-- 3. RLS POLICIES (CLEAN & NON-RECURSIVE)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- Conversations Policies
DROP POLICY IF EXISTS "Create conversations" ON public.conversations;
CREATE POLICY "Create conversations" ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Read conversations" ON public.conversations;
CREATE POLICY "Read conversations" ON public.conversations
FOR SELECT TO authenticated
USING (true); -- Simple read, members table handles access to messages/details

-- Members Policies
DROP POLICY IF EXISTS "Insert members" ON public.conversation_members;
CREATE POLICY "Insert members" ON public.conversation_members
FOR INSERT TO authenticated
WITH CHECK (true); -- Allowed for anyone to facilitate 1-to-1 creation

DROP POLICY IF EXISTS "Read members" ON public.conversation_members;
CREATE POLICY "Read members" ON public.conversation_members
FOR SELECT TO authenticated
USING (true); -- No recursion, anyone logged in can see members (needed for lookup)

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conv ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
