"use client";

import { useMemo, useRef, useState } from "react";
import { diffJson, type DiffKind } from "@/lib/diff";
import { preview, toJsonPath } from "@/lib/json";
import { useParser } from "@/lib/use-parser";
import { Editor, type EditorHandle } from "./Editor";
import { useVirtual } from "./useVirtual";
import { IconUpload } from "./Icons";
import { toast } from "./Toast";

const ROW_H = 30;

interface Props {
  doc: unknown;
  textB: string;
  setTextB: (t: string) => void;
  onReveal: (id: string) => void;
}

export function DiffView({ doc, textB, setTextB, onReveal }: Props) {
  const { outcome } = useParser(textB);
  const editorRef = useRef<EditorHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<DiffKind | "all">("all");
  const [dragOver, setDragOver] = useState(false);
  const b = outcome?.ok ? outcome.value : undefined;
  const result = useMemo(() => (b === undefined ? null : diffJson(doc, b)), [doc, b]);
  const entries = useMemo(() => (result ? (filter === "all" ? result.entries : result.entries.filter((e) => e.kind === filter)) : []), [result, filter]);
  const v = useVirtual(entries.length, ROW_H);
  const empty = textB.trim() === "";

  const loadFile = async (f: File | undefined) => {
    if (!f) return;
    setTextB(await f.text());
    toast(`Loaded ${f.name} as document B`);
  };

  const items = [];
  for (let i = v.start; i < v.end; i++) {
    const e = entries[i];
    items.push(
      <button type="button" key={e.id + e.kind} className={`diff-row diff-${e.kind}`} style={{ top: i * ROW_H }} onClick={() => e.kind !== "added" && onReveal(e.id)} title={e.kind === "added" ? "Only in B" : "Show in tree"}>
        <span className="diff-sign">{e.kind === "added" ? "+" : e.kind === "removed" ? "−" : "~"}</span>
        <span className="diff-path">{toJsonPath(e.kind === "added" ? b : doc, e.id)}</span>
        <span className="diff-vals">
          {e.kind !== "added" && <span className="diff-a">{preview(e.a, 60)}</span>}
          {e.kind === "changed" && <span className="diff-arrow">→</span>}
          {e.kind !== "removed" && <span className="diff-b">{preview(e.b, 60)}</span>}
        </span>
      </button>,
    );
  }

  return (
    <div className="view diff-view">
      <div className="toolbar">
        <span className="toolbar-meta">
          <strong>A</strong> = current document, <strong>B</strong> = paste or drop below
        </span>
        {result && (
          <div className="seg" role="group" aria-label="Filter changes">
            <button type="button" className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
              All {(result.counts.added + result.counts.removed + result.counts.changed).toLocaleString("en-US")}
            </button>
            <button type="button" className={`k-added${filter === "added" ? " on" : ""}`} onClick={() => setFilter("added")}>
              + {result.counts.added.toLocaleString("en-US")}
            </button>
            <button type="button" className={`k-removed${filter === "removed" ? " on" : ""}`} onClick={() => setFilter("removed")}>
              − {result.counts.removed.toLocaleString("en-US")}
            </button>
            <button type="button" className={`k-changed${filter === "changed" ? " on" : ""}`} onClick={() => setFilter("changed")}>
              ~ {result.counts.changed.toLocaleString("en-US")}
            </button>
          </div>
        )}
      </div>
      <div className="diff-body">
        <div
          className={`diff-input${dragOver ? " drag" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); // tells the window-level handler this drop is taken
            setDragOver(false);
            loadFile(e.dataTransfer.files[0]);
          }}
        >
          <div className="pane-head">
            <span className="pane-title">Document B</span>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <IconUpload /> Open
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json,text/plain" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
          </div>
          <Editor ref={editorRef} value={textB} onChange={setTextB} error={!empty && outcome && !outcome.ok ? outcome.error : null} label="Document B" placeholder="Paste the JSON to compare against…" />
          {!empty && outcome && !outcome.ok && (
            <button type="button" className="error-bar" onClick={() => editorRef.current?.jumpTo(outcome.error.offset, outcome.error.line)}>
              <span className="error-loc">
                Ln {outcome.error.line}, Col {outcome.error.column}
              </span>
              {outcome.error.message}
            </button>
          )}
        </div>
        <div className="diff-results">
          {empty ? (
            <div className="empty-inline">Paste a second document to see what changed. Objects are compared by key, arrays by index.</div>
          ) : result && result.entries.length === 0 && filter === "all" ? (
            <div className="empty-inline ok">No differences. The documents are structurally identical.</div>
          ) : null}
          <div ref={v.ref} className="scroller">
            <div style={{ height: v.total, position: "relative" }}>{items}</div>
          </div>
          {result?.truncated && <div className="notice">Showing the first {result.entries.length.toLocaleString("en-US")} differences.</div>}
        </div>
      </div>
    </div>
  );
}
