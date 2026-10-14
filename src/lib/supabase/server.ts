import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function createMissingServerClient() {
  const buildQuery = () => ({
    select: () => buildQuery(),
    insert: () => buildQuery(),
    update: () => buildQuery(),
    delete: () => buildQuery(),
    eq: () => buildQuery(),
    neq: () => buildQuery(),
    lte: () => buildQuery(),
    gte: () => buildQuery(),
    order: () => buildQuery(),
    limit: () => buildQuery(),
    maybeSingle: async () => ({ data: null, error: new Error('Supabase environment variables are missing.') }),
    single: async () => ({ data: null, error: new Error('Supabase environment variables are missing.') }),
    then: (resolve: (value: { data: null; error: Error }) => void) => Promise.resolve({ data: null, error: new Error('Supabase environment variables are missing.') }).then(resolve)
  });

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: new Error('Supabase environment variables are missing.') }),
      signUp: async () => ({ data: null, error: new Error('Supabase environment variables are missing.') }),
      signOut: async () => ({ error: null })
    },
    from: () => buildQuery(),
    rpc: async () => ({ data: null, error: new Error('Supabase environment variables are missing.') })
  } as any;
}

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.warn('[Supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not configured yet.');
    return createMissingServerClient();
  }

  const store = await cookies();
  return createServerClient(url, key, {
    cookies: { getAll: () => store.getAll(), setAll: (items) => { try { items.forEach(({name,value,options}) => store.set(name,value,options)); } catch {} } }
  });
}
