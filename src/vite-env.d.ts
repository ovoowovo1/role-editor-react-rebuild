/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COLOR_BLOCK_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
