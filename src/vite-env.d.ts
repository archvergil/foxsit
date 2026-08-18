/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_LOCAL_BACKEND_URL?: string
  readonly VITE_APP_ENV?: 'development' | 'preview' | 'production' | 'test'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
