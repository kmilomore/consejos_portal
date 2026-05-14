import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

let browserClient: ReturnType<typeof createSupabaseClient<Database>> | null | undefined;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (browserClient !== undefined) {
    return browserClient;
  }

  browserClient = createSupabaseClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      storageKey: "consejos-portal",
    },
  });
  return browserClient;
}
