-- FINAL FIX FOR POSTS TABLE AND RLS
-- Use this if you are getting "Error submitting post: {}"

-- 1. Ensure Columns Exist
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_poll BOOLEAN DEFAULT FALSE;

-- 2. ENABLE RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 3. RESET POLICIES (Clean slate)
DROP POLICY IF EXISTS "Public posts access" ON public.posts;
DROP POLICY IF EXISTS "Auth post creation" ON public.posts;
DROP POLICY IF EXISTS "Author post deletion" ON public.posts;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.posts;
DROP POLICY IF EXISTS "Allow read posts" ON public.posts;

-- 4. CREATE POLICIES
-- Allow anyone to read posts
CREATE POLICY "Allow read posts"
ON public.posts
FOR SELECT
USING (true);

-- Allow only authenticated users to insert, and only for themselves
CREATE POLICY "Allow authenticated insert"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Allow users to delete their own posts
CREATE POLICY "Allow author delete"
ON public.posts
FOR DELETE
TO authenticated
USING (auth.uid() = author_id);
