import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  throw new Error('Copy web/.env.example to web/.env and fill in your Supabase URL and anon key.');
}

export const supabase = createClient(url, key);

export async function ensureAuthenticated() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not restore your session: ${error.message}`);
  if (data.session?.user) return data.session.user.id;

  const { data: anonymous, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError || !anonymous.user) {
    throw new Error(signInError?.message ?? 'Could not create a secure session');
  }
  return anonymous.user.id;
}
