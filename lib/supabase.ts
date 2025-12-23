import { createClient } from '@supabase/supabase-js';

const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const claveSupabase = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!urlSupabase || !claveSupabase) {
  console.error('⚠️ Faltan las variables de entorno de Supabase');
}

export const supabase = createClient(urlSupabase, claveSupabase);
