-- 1. Tabela de Conversas
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Membros da Conversa
CREATE TABLE IF NOT EXISTS public.conversation_members (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

-- 3. Tabela de Mensagens
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    media_url TEXT,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'file', 'sticker', 'poll')),
    poll JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Ativar Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de RLS

-- Conversas
CREATE POLICY "Users can create conversations" ON public.conversations 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view their conversations" ON public.conversations 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members 
        WHERE conversation_id = id AND user_id = auth.uid()
    )
);

-- Membros da Conversa
CREATE POLICY "Users can insert members" ON public.conversation_members 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view members of their conversations" ON public.conversation_members 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members AS my_membership 
        WHERE my_membership.conversation_id = conversation_members.conversation_id 
        AND my_membership.user_id = auth.uid()
    )
);

-- Mensagens
CREATE POLICY "Users can insert messages to their conversations" ON public.messages 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversation_members 
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can view messages from their conversations" ON public.messages 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members 
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

-- 6. Função RPC para encontrar conversas entre utilizadores
CREATE OR REPLACE FUNCTION get_conversation_between_users(user_a UUID, user_b UUID)
RETURNS TABLE (id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT cm1.conversation_id
    FROM conversation_members cm1
    JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
    WHERE cm1.user_id = user_a
      AND cm2.user_id = user_b
      AND (
        SELECT COUNT(*) 
        FROM conversation_members 
        WHERE conversation_id = cm1.conversation_id
      ) = CASE WHEN user_a = user_b THEN 1 ELSE 2 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Tabela de Conexões (Networking estilo LinkedIn)
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(requester_id, receiver_id)
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections" ON public.connections 
FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create connection requests" ON public.connections 
FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their connection status" ON public.connections 
FOR UPDATE USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their connections" ON public.connections 
FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
