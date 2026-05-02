-- FIX: EXPLICIT FOREIGN KEY FOR POSTGREST JOIN
-- Ensures conversation_members.user_id correctly references profiles.id

DO $$ 
BEGIN
    -- Check if the constraint exists, if not, add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversation_members_user_id_fkey'
    ) THEN
        ALTER TABLE public.conversation_members 
        ADD CONSTRAINT conversation_members_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
