import { createClient } from '@supabase/supabase-js';

let _client = null;

/**
 * Supabase клиент (anonymous / public). Хэрэглэгч төлөвлөх, зарын CRUD,
 * Storage upload-ийг клиент талд хийхэд ашиглана. RLS дээр суурилдаг.
 *
 * Environment-д NEXT_PUBLIC_SUPABASE_URL болон NEXT_PUBLIC_SUPABASE_ANON_KEY
 * байхгүй бол null буцаана (тохиргоо гүйцэд болоогүй үед).
 */
export function getSupabase() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Бодит тохиргоо байгаа эсэхийг шалгах (placeholder эсвэл хоосон бол null)
  const isPlaceholder =
    !url ||
    !anonKey ||
    url.includes('TANII_PROJECT_REF') ||
    anonKey.includes('tanii_anon_key') ||
    anonKey.includes('your-anon');

  if (isPlaceholder) {
    return null;
  }

  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

export const IMAGE_BUCKET = 'listing-images';
