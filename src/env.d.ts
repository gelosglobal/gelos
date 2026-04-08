/** Replaces Vite's import.meta.env typing (esbuild inlines `define` at build time). */
interface ImportMetaEnv {
  readonly VITE_AUTH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
