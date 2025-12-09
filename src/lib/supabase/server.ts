import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSafeCookieStore } from '@/lib/cookies'

export async function createClient() {
  // Next.js 15: cookies() es asíncrono y debe aguardarse antes de usar sus valores
  // Usamos helper para asegurar consistencia y logging
  const cookieStore = await getSafeCookieStore();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Llamado desde un Server Component; es seguro ignorar si el middleware refresca la sesión.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ver comentario en set()
          }
        },
      },
    }
  );
}
