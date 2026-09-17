"use client";

import { useEffect, useRef, useState } from "react";
import { parseDocument, type ParseOutcome } from "./parse-core";

const WORKER_THRESHOLD = 64 * 1024; // small docs parse synchronously (no clone overhead, no flicker)

/** Parses `text`, debounced, in a Web Worker for anything non-trivial. */
export function useParser(text: string): { outcome: ParseOutcome | null; source: string | null; pending: boolean } {
  const [state, setState] = useState<{ outcome: ParseOutcome | null; source: string | null }>(() =>
    text.length < WORKER_THRESHOLD ? { outcome: parseDocument(text), source: text } : { outcome: null, source: null },
  );
  const [pending, setPending] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    const seq = ++seqRef.current;
    if (text.length < WORKER_THRESHOLD) {
      const id = setTimeout(() => {
        if (seq !== seqRef.current) return;
        setState({ outcome: parseDocument(text), source: text });
        setPending(false);
      }, 120);
      return () => clearTimeout(id);
    }
    setPending(true);
    const id = setTimeout(() => {
      let worker = workerRef.current;
      if (!worker) {
        try {
          worker = new Worker(new URL("./parse.worker.ts", import.meta.url));
          workerRef.current = worker;
        } catch {
          setState({ outcome: parseDocument(text), source: text });
          setPending(false);
          return;
        }
      }
      worker.onmessage = (e: MessageEvent<{ seq: number; outcome: ParseOutcome }>) => {
        if (e.data.seq !== seqRef.current) return;
        setState({ outcome: e.data.outcome, source: text });
        setPending(false);
      };
      worker.postMessage({ seq, text });
    }, 250);
    return () => clearTimeout(id);
  }, [text]);

  return { ...state, pending };
}
