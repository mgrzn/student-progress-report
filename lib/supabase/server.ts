
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const store = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables belum diatur.");
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },

      setAll(
        items: {
          name: string;
          value: string;
          options: CookieOptions;
        }[]
      ) {
        try {
          items.forEach(({ name, value, options }) => {
            store.set(name, value, options);
          });
        } catch {
          // Cookie tidak dapat diubah dari Server Component.
        }
      },
    },
  });
}
