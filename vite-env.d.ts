/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_KEY: string;
    readonly REACT_APP_WEBHOOK_URL: string;
    readonly [key: string]: string | undefined;
  }
}
