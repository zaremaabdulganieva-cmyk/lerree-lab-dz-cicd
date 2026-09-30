/// <reference types="vite/client" />

/** Настройки, которые подставляются при сборке из файла .env. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

/** Короткий хеш коммита, из которого собрано приложение (или 'local'). */
declare const __APP_VERSION__: string

interface ImportMeta {
  readonly env: ImportMetaEnv
}
