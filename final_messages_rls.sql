-- FINAL MESSAGES RLS FIX
-- Permite leitura e escrita de mensagens apenas para membros da conversa

-- 1. DROP OLD POLICIES
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- 2. SELECT POLICY
-- O utilizador pode ler mensagens se existir um registo dele na tabela conversation_members para essa conversa.
-- Como a policy de conversation_members já é filtrada por user_id = auth.uid(), não há recursão infinita.
CREATE POLICY "messages_select_p" ON public.messages 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members 
    WHERE conversation_id = messages.conversation_id 
    AND user_id = auth.uid()
  )
);

-- 3. INSERT POLICY
CREATE POLICY "messages_insert_p" ON public.messages 
FOR INSERT TO authenticated 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversation_members 
    WHERE conversation_id = conversation_id 
    AND user_id = auth.uid()
  )
);

-- 4. UPDATE POLICY (For Seen At & Edit)
CREATE POLICY "messages_update_p" ON public.messages 
FOR UPDATE TO authenticated 
USING (
  auth.uid() = sender_id OR 
  EXISTS (
    SELECT 1 FROM public.conversation_members 
    WHERE conversation_id = messages.conversation_id 
    AND user_id = auth.uid()
  )
)
WITH CHECK (true);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
