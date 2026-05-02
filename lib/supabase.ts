import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL||'https://sgjzjqqntrgygixthpdm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_L322cRkTqe_snRzjd48K5g_vNeuIesy';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
