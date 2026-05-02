-- 🎭 ADD REACTIONS SUPPORT
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

-- RLS for Reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select" ON public.message_reactions 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "reactions_insert" ON public.message_reactions 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_delete" ON public.message_reactions 
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add 'edited_at' to messages if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='edited_at') THEN
        ALTER TABLE public.messages ADD COLUMN edited_at TIMESTAMPTZ;
    END IF;
END $$;
