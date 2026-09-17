// Strict JSON validator used only when JSON.parse fails, to report a precise,
// browser-independent error position (Safari's JSON.parse gives no offset).

export interface JsonError {
  message: string;
  offset: number;
  line: number; // 1-based
  column: number; // 1-based
}

export function offsetToLineCol(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lastNl = -1;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lastNl = i;
    }
  }
  return { line, column: end - lastNl };
}

const NUMBER_RE = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

function describe(ch: string | undefined): string {
  if (ch === undefined) return "end of input";
  if (ch === "\n") return "line break";
  if (ch === "\t") return "tab";
  return `'${ch}'`;
}

/** Returns null when `text` is valid JSON, else the first error. */
export function locateJsonError(text: string): JsonError | null {
  const n = text.length;
  let i = 0;
  const stack: number[] = []; // 123 '{' or 91 '['

  const fail = (message: string, at = i): JsonError => {
    const pos = Math.min(at, n);
    return { message, offset: pos, ...offsetToLineCol(text, pos) };
  };

  const ws = () => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 32 || c === 9 || c === 10 || c === 13) i++;
      else break;
    }
  };

  // Returns an error or null; advances i past the closing quote.
  const readString = (): JsonError | null => {
    const start = i;
    i++; // opening quote
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 34) {
        i++;
        return null;
      }
      if (c === 92) {
        const e = text[i + 1];
        if (e === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) return fail("Invalid \\u escape: expected 4 hex digits", i);
          i += 6;
          continue;
        }
        if (e !== undefined && '"\\/bfnrt'.includes(e)) {
          i += 2;
          continue;
        }
        return fail(`Invalid escape sequence '\\${e ?? ""}' in string`, i);
      }
      if (c < 32) {
        return fail(c === 10 ? "Unterminated string (strings cannot contain raw line breaks)" : "Control character in string must be escaped", i);
      }
      i++;
    }
    return fail("Unterminated string", start);
  };

  const commentOrToken = (what: string): JsonError => {
    const ch = text[i];
    if (ch === "/" && (text[i + 1] === "/" || text[i + 1] === "*")) return fail("Comments are not allowed in JSON");
    if (ch === "'") return fail("Strings must use double quotes, not single quotes");
    if (ch !== undefined && /[A-Za-z_$]/.test(ch)) {
      const word = /[A-Za-z_$][\w$]*/y;
      word.lastIndex = i;
      const m = word.exec(text);
      const w = m ? m[0] : ch;
      if (what === "a property name") return fail(`Property names must be double-quoted (found ${w})`);
      return fail(`Unexpected token '${w}', expected ${what}`);
    }
    return fail(`Unexpected ${describe(ch)}, expected ${what}`);
  };

  // Reads `"key" :` inside an object. Leaves i at the value.
  const readKey = (): JsonError | null => {
    ws();
    if (text.charCodeAt(i) !== 34) return commentOrToken("a property name");
    const e = readString();
    if (e) return e;
    ws();
    if (text[i] !== ":") return fail(`Expected ':' after property name, found ${describe(text[i])}`);
    i++;
    return null;
  };

  ws();
  if (i >= n) return fail("Document is empty");

  for (;;) {
    // ---- expect a value
    ws();
    if (i >= n) return fail("Unexpected end of input, expected a value");
    const c = text[i];
    let scalarDone = true;
    if (c === "{") {
      i++;
      ws();
      if (text[i] === "}") {
        i++;
      } else {
        stack.push(123);
        const e = readKey();
        if (e) return e;
        scalarDone = false;
      }
    } else if (c === "[") {
      i++;
      ws();
      if (text[i] === "]") {
        i++;
      } else {
        stack.push(91);
        scalarDone = false;
      }
    } else if (c === '"') {
      const e = readString();
      if (e) return e;
    } else if (c === "-" || (c >= "0" && c <= "9")) {
      NUMBER_RE.lastIndex = i;
      const m = NUMBER_RE.exec(text);
      if (!m || m[0] === "-") return fail("Invalid number");
      const after = text[i + m[0].length];
      if (after !== undefined && /[0-9.eE+\-]/.test(after)) return fail(`Invalid number (${m[0][0] === "0" || m[0].startsWith("-0") ? "leading zeros are not allowed" : "malformed"})`, i + m[0].length);
      i += m[0].length;
    } else if (text.startsWith("true", i)) {
      i += 4;
    } else if (text.startsWith("false", i)) {
      i += 5;
    } else if (text.startsWith("null", i)) {
      i += 4;
    } else {
      if (c === "]" || c === "}") return fail(stack.length && text.slice(0, i).trimEnd().endsWith(",") ? "Trailing comma is not allowed" : `Unexpected ${describe(c)}, expected a value`);
      return commentOrToken("a value");
    }
    if (!scalarDone) continue;

    // ---- after a complete value
    let next = false;
    while (!next) {
      ws();
      if (stack.length === 0) {
        if (i < n) return fail(text[i] === "/" ? "Comments are not allowed in JSON" : `Unexpected ${describe(text[i])} after the end of the document`);
        return null;
      }
      const top = stack[stack.length - 1];
      const close = top === 123 ? "}" : "]";
      if (i >= n) return fail(`Unexpected end of input, expected ',' or '${close}'`);
      const ch = text[i];
      if (ch === ",") {
        const commaAt = i;
        i++;
        ws();
        if (text[i] === "}" || text[i] === "]") return fail("Trailing comma is not allowed", commaAt);
        if (top === 123) {
          const e = readKey();
          if (e) return e;
        }
        next = true;
      } else if (ch === close) {
        stack.pop();
        i++;
      } else if (ch === "}" || ch === "]") {
        return fail(`Mismatched '${ch}', expected '${close}'`);
      } else if (ch === "/" && (text[i + 1] === "/" || text[i + 1] === "*")) {
        return fail("Comments are not allowed in JSON");
      } else {
        return fail(`Expected ',' or '${close}', found ${describe(ch)}`);
      }
    }
  }
}
