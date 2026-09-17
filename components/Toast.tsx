"use client";

import { useEffect, useState } from "react";

type Msg = { id: number; text: string; tone: "ok" | "err" };
let listeners: ((m: Msg) => void)[] = [];
let nextId = 1;

export function toast(text: string, tone: "ok" | "err" = "ok") {
  const m = { id: nextId++, text, tone };
  listeners.forEach((l) => l(m));
}

export async function copyText(text: string, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    const size = text.length > 1024 ? ` (${(text.length / 1024).toFixed(0)} KB)` : "";
    toast(`${label}${size}`);
  } catch {
    toast("Clipboard is unavailable in this context", "err");
  }
}

export function Toaster() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  useEffect(() => {
    const l = (m: Msg) => {
      setMsgs((cur) => [...cur.slice(-2), m]);
      setTimeout(() => setMsgs((cur) => cur.filter((x) => x.id !== m.id)), 2200);
    };
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {msgs.map((m) => (
        <div key={m.id} className={`toast toast-${m.tone}`}>
          {m.text}
        </div>
      ))}
    </div>
  );
}

export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
