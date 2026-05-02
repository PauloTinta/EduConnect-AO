-- ADVANCED FEED SYSTEM UPDATES
-- Tables, RLS, and Gamification

-- 1. REPOSTS TABLE
CREATE TABLE IF NOT EXISTS public.reposts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    post_id UUID REFERENCES public.posts(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, post_id)
);

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow repost insert" ON public.reposts;
CREATE POLICY "Allow repost insert" ON public.reposts
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow repost read" ON public.reposts;
CREATE POLICY "Allow repost read" ON public.reposts
FOR SELECT USING (true);

-- 2. POLL VOTES TABLE (Improved)
CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    poll_id UUID REFERENCES public.polls(id) NOT NULL,
    option_id UUID REFERENCES public.poll_options(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, poll_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow vote insert" ON public.poll_votes;
CREATE POLICY "Allow vote insert" ON public.poll_votes
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow vote read" ON public.poll_votes;
CREATE POLICY "Allow vote read" ON public.poll_votes
FOR SELECT USING (true);

-- 3. ENSURE HASHTAGS COLUMN IN POSTS
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';

-- 4. COMMENTS TABLE (Ensure exists)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow comment insert" ON public.comments;
CREATE POLICY "Allow comment insert" ON public.comments
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow comment read" ON public.comments;
CREATE POLICY "Allow comment read" ON public.comments
FOR SELECT USING (true);

-- 5. FUNCTION TO UPDATE COUNTERS (Optional but good for performance)
-- We'll handle most counters via simple increment/decrement in app code for now per request scope,
-- but triggers are better for real apps.

-- 6. GAMIFICATION COLUMNS (Ensure exist in profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON public.posts USING GIN (hashtags);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON public.reposts (post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes (poll_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);
