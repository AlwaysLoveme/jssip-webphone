/// <reference types="@rsbuild/core/types" />

//cursor-start
interface ImportMetaEnv {
  readonly PUBLIC_SOCKET: string;
  readonly PUBLIC_DOMAIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
//cursor-end
