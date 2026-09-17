export type TokenKind = "key" | "string" | "number" | "boolean" | "null" | "punct" | "text";

export interface Token {
  kind: TokenKind;
  text: string;
}

const TOKEN_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b|([{}\[\],:])/g;

/** Tokenise one line of pretty-printed JSON for syntax colouring. */
export function tokenizeLine(line: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(line))) {
    if (m.index > last) out.push({ kind: "text", text: line.slice(last, m.index) });
    if (m[1] !== undefined) {
      if (m[2] !== undefined) {
        out.push({ kind: "key", text: m[1] });
        out.push({ kind: "punct", text: m[2] });
      } else out.push({ kind: "string", text: m[1] });
    } else if (m[3] !== undefined) out.push({ kind: "number", text: m[3] });
    else if (m[4] !== undefined) out.push({ kind: "boolean", text: m[4] });
    else if (m[5] !== undefined) out.push({ kind: "null", text: m[5] });
    else out.push({ kind: "punct", text: m[6] });
    last = TOKEN_RE.lastIndex;
  }
  if (last < line.length) out.push({ kind: "text", text: line.slice(last) });
  return out;
}

export type Indent = "2" | "4" | "tab" | "min";

export function stringify(value: unknown, indent: Indent): string {
  if (indent === "min") return JSON.stringify(value);
  return JSON.stringify(value, null, indent === "tab" ? "\t" : Number(indent));
}
