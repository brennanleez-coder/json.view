import { parseDocument } from "./parse-core";

// Parses off the main thread; the parsed value is structured-cloned back.
self.onmessage = (e: MessageEvent<{ seq: number; text: string }>) => {
  const { seq, text } = e.data;
  const outcome = parseDocument(text);
  (self as unknown as Worker).postMessage({ seq, outcome });
};
