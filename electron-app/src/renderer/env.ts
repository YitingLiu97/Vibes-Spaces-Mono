declare global {
  // Vite injects these at build time when prefixed with VITE_.
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_ORG_ID?: string;
    readonly VITE_CLIENT_VERSION?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
export const ORG_ID =
  import.meta.env.VITE_ORG_ID ?? '00000000-0000-0000-0000-000000000001';
export const CLIENT_VERSION = import.meta.env.VITE_CLIENT_VERSION ?? '0.1.0';
