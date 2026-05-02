-- SUPABASE SOCIAL SCHEMA

-- 1. Posts (Garantir que existe e tem os campos necessários)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'audio')),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reposts_count INTEGER DEFAULT 0,
    is_poll BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Post Likes
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, post_id)
);

-- 3. Comments
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Reposts
CREATE TABLE IF NOT EXISTS public.reposts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, post_id)
);

-- 5. Saved Posts
CREATE TABLE IF NOT EXISTS public.saved_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, post_id)
);

-- 6. Hashtags
CREATE TABLE IF NOT EXISTS public.hashtags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tag TEXT UNIQUE NOT NULL
);

-- 7. Post Hashtags (Relacional)
CREATE TABLE IF NOT EXISTS public.post_hashtags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    hashtag_id UUID REFERENCES public.hashtags(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(post_id, hashtag_id)
);

-- 8. Polls
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Poll Options
CREATE TABLE IF NOT EXISTS public.poll_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    votes_count INTEGER DEFAULT 0
);

-- 10. Poll Votes
CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(poll_id, user_id)
);

-- ATIVAR RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS BÁSICAS (Leitura pública, Escrita autenticada)

-- Posts: Ver todos, Inserir autenticado, Delete próprio
CREATE POLICY "Public posts access" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Auth post creation" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author post deletion" ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- Likes
CREATE POLICY "Public likes access" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Auth like toggle" ON public.post_likes FOR ALL USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Public comments access" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Auth comment creation" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Saveds
CREATE POLICY "Personal saved access" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Auth save toggle" ON public.saved_posts FOR ALL USING (auth.uid() = user_id);

-- Polls & Votes
CREATE POLICY "Public poll access" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Public poll options access" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "Public votes access" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Auth poll voting" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TRIGGERS PARA CONTADORES E XP

-- Increment/Decrement Likes Count
CREATE OR REPLACE FUNCTION handle_post_like() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        -- Ganhar XP para o autor do post (+2)
        UPDATE public.profiles SET xp = xp + 2 WHERE id = (SELECT author_id FROM public.posts WHERE id = NEW.post_id);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_like AFTER INSERT OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION handle_post_like();

-- Increment Comments Count
CREATE OR REPLACE FUNCTION handle_post_comment() RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    -- Ganhar XP para o comentador (+5)
    UPDATE public.profiles SET xp = xp + 5 WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION handle_post_comment();

-- Handle Post Creation XP
CREATE OR REPLACE FUNCTION handle_post_creation() RETURNS TRIGGER AS $$
BEGIN
    -- Ganhar XP para o autor (+10)
    UPDATE public.profiles SET xp = xp + 10 WHERE id = NEW.author_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_created AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION handle_post_creation();

-- Auto Update Level based on XP
CREATE OR REPLACE FUNCTION update_user_level() RETURNS TRIGGER AS $$
DECLARE
    new_level INTEGER;
BEGIN
    new_level := floor(NEW.xp / 100) + 1;
    IF new_level > NEW.level THEN
        NEW.level := new_level;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_xp_update BEFORE UPDATE OF xp ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_user_level();
