-- FIX POLLS AND POLL OPTIONS RLS
-- Resolve "new row violates row-level security policy for table polls"

-- 1. Ensure Table Structure for Polls (in case it's missing)
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

-- 2. RESET POLICIES for Polls
DROP POLICY IF EXISTS "Public poll access" ON public.polls;
DROP POLICY IF EXISTS "Auth poll creation" ON public.polls;

-- 3. CREATE POLICIES for Polls
CREATE POLICY "Allow public read polls"
ON public.polls FOR SELECT USING (true);

-- Allow authenticated users to create polls if they own the related post
CREATE POLICY "Allow authenticated insert polls"
ON public.polls
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.posts 
        WHERE id = post_id AND author_id = auth.uid()
    )
);

-- 4. RESET POLICIES for Poll Options
DROP POLICY IF EXISTS "Public poll options access" ON public.poll_options;
DROP POLICY IF EXISTS "Auth poll options creation" ON public.poll_options;

-- 5. CREATE POLICIES for Poll Options
CREATE POLICY "Allow public read poll_options"
ON public.poll_options FOR SELECT USING (true);

-- Allow authenticated users to create options for polls they own (via post)
CREATE POLICY "Allow authenticated insert poll_options"
ON public.poll_options
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.polls
        JOIN public.posts ON polls.post_id = posts.id
        WHERE polls.id = poll_id AND posts.author_id = auth.uid()
    )
);
