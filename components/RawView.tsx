"use client";

import { memo, useMemo, useState } from "react";
import { getAt, toJsonPath } from "@/lib/json";
import { stringify, tokenizeLine, type Indent } from "@/lib/highlight";
import { inferSchema } from "@/lib/schema";
import { useVirtual } from "./useVirtual";
import { copyText, downloadText } from "./Toast";
import { IconCopy, IconDownload } from "./Icons";

const LINE_H = 20;
const MIN_PREVIEW = 400_000;

interface Props {
  doc: unknown;
  selected: string;
  indent: Indent;
  setIndent: (i: Indent) => void;
}

const Line = memo(function Line({ text, n, top }: { text: string; n: number; top: number }) {
  return (
    <div className="raw-line" style={{ top }}>
      <span className="raw-ln">{n}</span>
      <span className="raw-code">
        {tokenizeLine(text).map((t, i) =>
          t.kind === "text" ? t.text : (
            <span key={i} className={`t-${t.kind}`}>
              {t.text}
            </span>
          ),
        )}
      </span>
    </div>
  );
});

export function RawView({ doc, selected, indent, setIndent }: Props) {
  const [mode, setMode] = useState<"json" | "schema">("json");
  const [scopeMode, setScopeMode] = useState<"doc" | "selection">("doc");
  const scope = scopeMode === "doc" ? "" : selected;
  const value = getAt(doc, scope).value;

  const text = useMemo(() => {
    const v = mode === "schema" ? inferSchema(value) : value;
    return stringify(v, mode === "schema" && indent === "min" ? "2" : indent) ?? "undefined";
  }, [value, mode, indent]);

  const lines = useMemo(() => (indent === "min" && mode === "json" ? null : text.split("\n")), [text, indent, mode]);
  const v = useVirtual(lines?.length ?? 0, LINE_H, 20);
  const gutterCh = String(lines?.length ?? 1).length + 1;

  const items = [];
  if (lines) for (let i = v.start; i < v.end; i++) items.push(<Line key={i} text={lines[i]} n={i + 1} top={i * LINE_H} />);

  const filename = mode === "schema" ? "schema.json" : scope === "" ? "document.json" : "selection.json";

  return (
    <div className="view raw-view">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Output">
          <button type="button" className={mode === "json" ? "on" : ""} onClick={() => setMode("json")}>
            JSON
          </button>
          <button type="button" className={mode === "schema" ? "on" : ""} onClick={() => setMode("schema")} title="Infer a JSON Schema from the data">
            Schema
          </button>
        </div>
        <div className="seg" role="group" aria-label="Scope">
          <button type="button" className={scopeMode === "doc" ? "on" : ""} onClick={() => setScopeMode("doc")}>
            Document
          </button>
          <button type="button" className={scopeMode === "selection" ? "on" : ""} onClick={() => setScopeMode("selection")} title={toJsonPath(doc, selected)}>
            Selection
          </button>
        </div>
        <div className="seg" role="group" aria-label="Indent">
          {(["2", "4", "tab", "min"] as Indent[]).map((i) => (
            <button key={i} type="button" className={indent === i ? "on" : ""} onClick={() => setIndent(i)}>
              {i === "min" ? "Minify" : i === "tab" ? "Tab" : `${i} sp`}
            </button>
          ))}
        </div>
        <span className="toolbar-meta">{(text.length / 1024).toFixed(1)} KB</span>
        <button type="button" className="btn" onClick={() => copyText(text, mode === "schema" ? "Copied schema" : "Copied JSON")}>
          <IconCopy /> Copy
        </button>
        <button type="button" className="btn" onClick={() => downloadText(text, filename)}>
          <IconDownload /> Save
        </button>
      </div>
      <div ref={v.ref} className={`scroller ${lines ? "raw-scroller" : "raw-min"}`} style={{ ["--gutter-ch" as string]: gutterCh }}>
        {lines ? (
          <div style={{ height: v.total, position: "relative", minWidth: "100%" }}>{items}</div>
        ) : (
          <>
            <pre>{text.length > MIN_PREVIEW ? text.slice(0, MIN_PREVIEW) : text}</pre>
            {text.length > MIN_PREVIEW && <div className="notice">Preview truncated at {MIN_PREVIEW / 1000} KB. Copy or Save gets the whole thing.</div>}
          </>
        )}
      </div>
    </div>
  );
}
