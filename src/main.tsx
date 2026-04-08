import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { App } from "./app/App";

declare global {
  interface Window {
    storage?: {
      get: (key: string) => Promise<{ value: string } | null>;
      set: (key: string, value: string) => Promise<void>;
    };
  }
}

// Polyfill used by the original Claude artifact code (window.storage).
// We back it with localStorage so the app works in any browser.
window.storage ??= {
  async get(key: string) {
    const value = localStorage.getItem(key);
    return value === null ? null : { value };
  },
  async set(key: string, value: string) {
    localStorage.setItem(key, value);
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

