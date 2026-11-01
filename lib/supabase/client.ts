import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key) throw new Error("Supabase environment variables belum diatur.");
 return createBrowserClient(url,key);
}
