-- COMPREHENSIVE FIX FOR MESSAGING, REPOSTS, CONNECTIONS AND NOTIFICATIONS

-- 1. MESSAGING SYSTEM
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(conversation_id, user_id)
);

-- RLS for Messaging
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- FIRST: DROP ALL POTENTIAL CONFLICTING OR RECURSIVE POLICIES
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow select conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow insert conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can insert members" ON public.conversation_members;
DROP POLICY IF EXISTS "Allow select members" ON public.conversation_members;
DROP POLICY IF EXISTS "Allow insert members" ON public.conversation_members;

-- NOW RE-CREATE CLEAN, NON-RECURSIVE POLICIES
CREATE POLICY "Allow insert conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow select conversations" ON public.conversations
FOR SELECT TO authenticated
USING (
    EXISTS (
        -- Use a separate query that doesn't trigger recursion if possible
        -- But for 1-to-1 finding, we just need to see if we are in it.
        -- Selecting from conversation_members is usually fine if THAT table's policy is 'true'
        SELECT 1 FROM public.conversation_members 
        WHERE conversation_id = id AND user_id = auth.uid()
    )
);

CREATE POLICY "Allow insert members" ON public.conversation_members 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow select members" ON public.conversation_members
FOR SELECT TO authenticated
USING (true); -- NO RECURSION HERE

-- 2. REPOSTS SYSTEM
CREATE TABLE IF NOT EXISTS public.reposts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    post_id UUID REFERENCES public.posts(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, post_id)
);

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow repost insert" ON public.reposts;
CREATE POLICY "Allow repost insert" ON public.reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow repost read" ON public.reposts;
CREATE POLICY "Allow repost read" ON public.reposts FOR SELECT USING (true);

-- 3. CONNECTIONS SYSTEM
DO $$ 
BEGIN
    -- Se a tabela já existir, tentamos renomear requester_id para sender_id se necessário
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'connections') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='connections' AND column_name='requester_id') THEN
            ALTER TABLE public.connections RENAME COLUMN requester_id TO sender_id;
        END IF;
    ELSE
        CREATE TABLE public.connections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sender_id UUID REFERENCES public.profiles(id) NOT NULL,
            receiver_id UUID REFERENCES public.profiles(id) NOT NULL,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            UNIQUE(sender_id, receiver_id)
        );
    END IF;
END $$;

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow selection connections" ON public.connections;
CREATE POLICY "Allow selection connections" ON public.connections FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Allow insert connections" ON public.connections;
CREATE POLICY "Allow insert connections" ON public.connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Allow update connections" ON public.connections;
CREATE POLICY "Allow update connections" ON public.connections FOR UPDATE TO authenticated USING (auth.uid() = receiver_id);

-- 4. NOTIFICATIONS SYSTEM
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL, -- person receiving the notification
    from_user UUID REFERENCES public.profiles(id),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select notifications" ON public.notifications;
CREATE POLICY "Allow select notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow insert notifications" ON public.notifications;
CREATE POLICY "Allow insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true); -- Usually generated by system or actions

-- 5. TRIGGERS FOR COUNTERS

-- Reposts Count
CREATE OR REPLACE FUNCTION public.handle_post_repost() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts SET reposts_count = reposts_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts SET reposts_count = reposts_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_repost ON public.reposts;
CREATE TRIGGER on_post_repost AFTER INSERT OR DELETE ON public.reposts FOR EACH ROW EXECUTE FUNCTION public.handle_post_repost();

-- Poll Votes Count
CREATE OR REPLACE FUNCTION public.handle_poll_vote() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.poll_options SET votes_count = votes_count + 1 WHERE id = NEW.option_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.poll_options SET votes_count = votes_count - 1 WHERE id = OLD.option_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_poll_vote ON public.poll_votes;
CREATE TRIGGER on_poll_vote AFTER INSERT OR DELETE ON public.poll_votes FOR EACH ROW EXECUTE FUNCTION public.handle_poll_vote();
