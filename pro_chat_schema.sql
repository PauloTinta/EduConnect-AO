-- PRO CHAT SYSTEM MIGRATION
-- Updates messages and adds support for polls, media, and read receipts

-- 1. UPDATE MESSAGES TABLE
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('text', 'image', 'video', 'audio', 'voice', 'poll'));
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES public.messages(id);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS seen_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS poll_data JSONB; -- Store poll question and options

-- 2. POLL VOTES TABLE
CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(message_id, user_id)
);

-- RLS for Poll Votes
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view votes" ON public.poll_votes;
CREATE POLICY "Anyone can view votes" ON public.poll_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can vote" ON public.poll_votes;
CREATE POLICY "Authenticated users can vote" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can change their vote" ON public.poll_votes;
CREATE POLICY "Users can change their vote" ON public.poll_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. STORAGE SETUP (Chat Media)
-- Note: Buckets must be created in the Supabase Dashboard, but we define RLS here.
-- Assuming bucket 'chat-media' exists.

/* 
  SQL for Bucket Policies (Run this if you can, otherwise set manually in Dashboard):
  
  -- Allow public read
  CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
  
  -- Allow authenticated uploads
  CREATE POLICY "Auth Upload Access" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media');
  
  -- Allow owners to delete their media
  CREATE POLICY "Owner Delete Access" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-media' AND owner = auth.uid());
*/

-- 4. MESSAGES RLS UPDATES
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages 
FOR UPDATE TO authenticated 
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- 5. TYPING INDICATOR & PRESENCE (Handled via Supabase Realtime Channels / Broadcast)
-- No specific SQL needed for Broadcast, it happens at the application level.
