/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** SSE endpoint of the Python classifier; defaults to 127.0.0.1:8000 when unset. */
  readonly VITE_SIGNAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
