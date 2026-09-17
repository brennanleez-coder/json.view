"use client";

import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { JsonError } from "@/lib/locate";

export const LINE_H = 20;
const PAD_TOP = 8;

export interface EditorHandle {
  jumpTo: (offset: number, line: number) => void;
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  error: JsonError | null;
  placeholder?: string;
  label: string;
}

function countLines(s: string) {
  let n = 1;
  for (let i = s.indexOf("\n"); i !== -1; i = s.indexOf("\n", i + 1)) n++;
  return n;
}

/** Plain textarea with a virtualised line gutter and an error line band. */
export const Editor = forwardRef<EditorHandle, Props>(function Editor({ value, onChange, error, placeholder, label }, ref) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [scroll, setScroll] = useState({ top: 0, height: 600 });
  const lines = useMemo(() => countLines(value), [value]);

  useImperativeHandle(ref, () => ({
    jumpTo(offset, line) {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(offset, Math.min(offset + 1, value.length));
      ta.scrollTop = Math.max(0, (line - 1) * LINE_H - ta.clientHeight / 2);
    },
    focus() {
      taRef.current?.focus();
    },
  }));

  const onScroll = useCallback(() => {
    const ta = taRef.current;
    if (ta) setScroll({ top: ta.scrollTop, height: ta.clientHeight });
  }, []);

  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    onScroll();
    const ro = new ResizeObserver(onScroll);
    ro.observe(ta);
    return () => ro.disconnect();
  }, [onScroll]);

  const first = Math.max(0, Math.floor((scroll.top - PAD_TOP) / LINE_H) - 2);
  const last = Math.min(lines, first + Math.ceil(scroll.height / LINE_H) + 6);
  const nums = [];
  for (let i = first; i < last; i++) {
    nums.push(
      <div key={i} className={error && error.line === i + 1 ? "gutter-err" : undefined} style={{ top: PAD_TOP + i * LINE_H - scroll.top }}>
        {i + 1}
      </div>,
    );
  }
  const gutterW = Math.max(3, String(lines).length) + 2;

  return (
    <div className="editor" style={{ ["--gutter-ch" as string]: gutterW }}>
      <div className="gutter" aria-hidden="true">
        {nums}
      </div>
      <div className="editor-body">
        {error && <div className="err-band" style={{ top: PAD_TOP + (error.line - 1) * LINE_H - scroll.top }} />}
        <textarea
          ref={taRef}
          aria-label={label}
          className="editor-ta"
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap="off"
          placeholder={placeholder}
          onScroll={onScroll}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
});
