"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ancestorIds, childCount, crumbs, expandNestedJson, formatBytes, getAt, isContainer, toJsAccessor, toJsonPath, typeOf, type Expansion } from "@/lib/json";
import { stringify, type Indent } from "@/lib/highlight";
import { useParser } from "@/lib/use-parser";
import { generateLarge, samples } from "@/lib/samples";
import { Editor, type EditorHandle } from "./Editor";
import { TreeView } from "./TreeView";
import { TableView } from "./TableView";
import { GraphView } from "./GraphView";
import { RawView } from "./RawView";
import { DiffView } from "./DiffView";
import { Toaster, copyText, downloadText, toast } from "./Toast";
import { IconCopy, IconDownload, IconKeyboard, IconMinify, IconMoon, IconPath, IconSidebar, IconSun, IconUpload, IconWand, IconX } from "./Icons";

type View = "tree" | "table" | "graph" | "raw" | "diff";
const VIEWS: { id: View; label: string; key: string }[] = [
  { id: "tree", label: "Tree", key: "1" },
  { id: "table", label: "Table", key: "2" },
  { id: "graph", label: "Graph", key: "3" },
  { id: "raw", label: "Raw", key: "4" },
  { id: "diff", label: "Diff", key: "5" },
];

const LS = {
  doc: "jsonlite:doc",
  diff: "jsonlite:diff-b",
  view: "jsonlite:view",
  indent: "jsonlite:indent",
  input: "jsonlite:input-open",
  width: "jsonlite:input-width",
};
const PERSIST_MAX = 1024 * 1024;
// Browsers take seconds to lay out a multi-megabyte <textarea>; above this the input shows a summary instead.
const EDIT_MAX = 1024 * 1024; // don't keep huge documents in localStorage

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* quota or disabled storage */
    }
  },
};

const DEFAULT_EXPANSION = (): Expansion => ({ depth: 3, overrides: new Map() });

export default function App() {
  const [ready, setReady] = useState(false);
  const [text, setTextRaw] = useState("");
  const [textB, setTextB] = useState("");
  const [view, setView] = useState<View>("tree");
  const [indent, setIndent] = useState<Indent>("2");
  const [inputOpen, setInputOpen] = useState(true);
  const [inputWidth, setInputWidth] = useState(420);
  const [mobilePane, setMobilePane] = useState<"input" | "view">("view");
  const [selected, setSelected] = useState("");
  const [expansion, setExpansion] = useState<Expansion>(DEFAULT_EXPANSION);
  const [revealNonce, setRevealNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [forceEdit, setForceEdit] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const editorRef = useRef<EditorHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { outcome, source, pending } = useParser(text);

  // Keep showing the last valid document while the input is temporarily broken.
  const lastGood = useRef<{ value: unknown; stats: NonNullable<Extract<typeof outcome, { ok: true }>>["stats"] } | null>(null);
  if (text.trim() === "") lastGood.current = null;
  else if (outcome?.ok && source === text) lastGood.current = { value: outcome.value, stats: outcome.stats };
  const doc = lastGood.current?.value;
  const hasDoc = lastGood.current !== null;
  const error = outcome && !outcome.ok && text.trim() !== "" ? outcome.error : null;

  // ---------- boot: restore state (never from the network)
  useEffect(() => {
    let initial = store.get(LS.doc);
    const url = new URL(window.location.href);
    const legacy = url.searchParams.get("json");
    if (legacy !== null) {
      // Old JsonLite links carried the document in ?json=. Import it once, then drop it from the address bar.
      try {
        initial = JSON.stringify(JSON.parse(legacy), null, 2);
        toast("Imported the document from an old share link");
      } catch {
        /* ignore */
      }
      url.searchParams.delete("json");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    setTextRaw(initial ?? samples[0].text());
    setTextB(store.get(LS.diff) ?? "");
    const v = store.get(LS.view) as View | null;
    if (v && VIEWS.some((x) => x.id === v)) setView(v);
    const ind = store.get(LS.indent) as Indent | null;
    if (ind && ["2", "4", "tab", "min"].includes(ind)) setIndent(ind);
    if (store.get(LS.input) === "0") setInputOpen(false);
    const w = Number(store.get(LS.width));
    if (w >= 260 && w <= 1400) setInputWidth(w);
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    setReady(true);
  }, []);

  // ---------- persistence (debounced)
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => store.set(LS.doc, text.length <= PERSIST_MAX ? text : null), 400);
    return () => clearTimeout(t);
  }, [text, ready]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => store.set(LS.diff, textB.length <= PERSIST_MAX ? textB : null), 400);
    return () => clearTimeout(t);
  }, [textB, ready]);
  useEffect(() => void (ready && store.set(LS.view, view)), [view, ready]);
  useEffect(() => void (ready && store.set(LS.indent, indent)), [indent, ready]);
  useEffect(() => void (ready && store.set(LS.input, inputOpen ? "1" : "0")), [inputOpen, ready]);
  useEffect(() => void (ready && store.set(LS.width, String(inputWidth))), [inputWidth, ready]);

  // selection must exist in the current document
  useEffect(() => {
    if (hasDoc && !getAt(doc, selected).found) setSelected("");
  }, [doc, hasDoc, selected]);

  /** Replace the whole document (file, sample, format) and reset the view state. */
  const loadText = useCallback((t: string, opts: { keepView?: boolean } = {}) => {
    setTextRaw(t);
    if (t.length <= EDIT_MAX) setForceEdit(false);
    if (!opts.keepView) {
      setForceEdit(false);
      lastGood.current = null; // a different document must not show the previous one as the last valid version
      setSelected("");
      setQuery("");
      // big documents open shallower so the first render stays cheap
      setExpansion({ depth: t.length > 2_000_000 ? 2 : 3, overrides: new Map() });
    }
  }, []);

  const loadFile = useCallback(
    async (f: File | undefined) => {
      if (!f) return;
      const t = await f.text();
      loadText(t);
      setMobilePane("view");
      toast(`Opened ${f.name} · ${formatBytes(f.size)}`);
    },
    [loadText],
  );

  const reveal = useCallback((id: string) => {
    setExpansion((e) => {
      const overrides = new Map(e.overrides);
      for (const a of ancestorIds(id)) overrides.set(a, true);
      return { ...e, overrides };
    });
    setSelected(id);
    setRevealNonce((n) => n + 1);
  }, []);

  const revealInTree = useCallback(
    (id: string) => {
      reveal(id);
      setView("tree");
    },
    [reveal],
  );

  // ---------- window drag & drop
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      depth = 0;
      setDragging(false);
      if (!hasFiles(e) || e.defaultPrevented) return; // e.g. dropped onto Diff's document B
      e.preventDefault();
      loadFile(e.dataTransfer!.files[0]);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [loadFile]);

  // ---------- global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.tagName === "SELECT";
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        fileRef.current?.click();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        format();
      } else if (mod && e.key === "\\") {
        e.preventDefault();
        setInputOpen((o) => !o);
      } else if (!typing && !mod && !e.altKey && e.key >= "1" && e.key <= "5") {
        setView(VIEWS[Number(e.key) - 1].id);
      } else if (!typing && e.key === "?") {
        setShowKeys((s) => !s);
      } else if (e.key === "Escape") {
        setShowKeys(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const goToError = () => {
    if (!error) return;
    setMobilePane("input");
    setForceEdit(true);
    setTimeout(() => editorRef.current?.jumpTo(error.offset, error.line), 0);
  };

  const format = (ind: Indent = indent === "min" ? "2" : indent) => {
    if (!outcome?.ok) {
      if (error) {
        goToError();
        toast("Fix the error first", "err");
      }
      return;
    }
    loadText(stringify(outcome.value, ind), { keepView: true });
  };

  const unescapeNested = () => {
    if (!outcome?.ok) return;
    const r = expandNestedJson(outcome.value);
    if (!r.expanded) {
      toast("No stringified JSON found");
      return;
    }
    loadText(stringify(r.value, indent === "min" ? "2" : indent), { keepView: true });
    toast(`Expanded ${r.expanded} stringified value${r.expanded === 1 ? "" : "s"}`);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    store.set("jsonlite:theme", next);
  };

  // ---------- resizable input pane
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = inputWidth;
    const move = (ev: PointerEvent) => setInputWidth(Math.max(260, Math.min(window.innerWidth - 360, startW + ev.clientX - startX)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.classList.remove("resizing");
    };
    document.body.classList.add("resizing");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // ---------- selection summary
  const sel = hasDoc ? getAt(doc, selected) : { found: false, value: undefined };
  const selCrumbs = useMemo(() => (hasDoc ? crumbs(doc, selected) : []), [doc, hasDoc, selected]);
  const selType = sel.found ? typeOf(sel.value) : null;
  const selSize = sel.found
    ? isContainer(sel.value)
      ? `${childCount(sel.value).toLocaleString("en-US")} ${Array.isArray(sel.value) ? "items" : "keys"}`
      : typeof sel.value === "string"
        ? `${sel.value.length.toLocaleString("en-US")} chars`
        : null
    : null;

  const stats = lastGood.current?.stats;
  const bytes = useMemo(() => new Blob([text]).size, [text]);

  return (
    <div className={`app${inputOpen ? "" : " input-closed"} mobile-${mobilePane}`} style={{ ["--input-w" as string]: `${inputWidth}px` }}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            {"{"}
            <i />
            {"}"}
          </span>
          <span className="brand-name">jsonlite</span>
        </div>
        <button type="button" className="icon-btn hide-mobile" onClick={() => setInputOpen((o) => !o)} aria-label={inputOpen ? "Hide input" : "Show input"} title="Toggle input (⌘\)">
          <IconSidebar />
        </button>
        <div className="doc-stats" aria-live="polite">
          {error ? (
            <span className="status status-err">
              <i /> Invalid · Ln {error.line}, Col {error.column}
            </span>
          ) : pending ? (
            <span className="status status-busy">
              <i /> Parsing…
            </span>
          ) : hasDoc ? (
            <span className="status status-ok">
              <i /> Valid
            </span>
          ) : null}
          {stats && (
            <span className="stats-list">
              <span>{formatBytes(bytes)}</span>
              <span>{stats.nodes.toLocaleString("en-US")} nodes</span>
              <span className="hide-mobile">depth {stats.maxDepth}</span>
              {outcome && <span className="hide-mobile">{outcome.ms < 1 ? "<1" : Math.round(outcome.ms)} ms</span>}
            </span>
          )}
        </div>
        <div className="mobile-switch seg" role="group" aria-label="Pane">
          <button type="button" className={mobilePane === "input" ? "on" : ""} onClick={() => setMobilePane("input")}>
            Input
          </button>
          <button type="button" className={mobilePane === "view" ? "on" : ""} onClick={() => setMobilePane("view")}>
            View
          </button>
        </div>
        <span className="topbar-spacer" />
        <span className="privacy hide-mobile" title="Parsing, search and diff run in your browser. Nothing is uploaded.">
          Local only · nothing leaves your browser
        </span>
        <button type="button" className="icon-btn hide-mobile" onClick={() => setShowKeys(true)} aria-label="Keyboard shortcuts" title="Shortcuts (?)">
          <IconKeyboard />
        </button>
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
      </header>

      <main className="workspace">
        <section className="input-pane" aria-label="Input">
          <div className="pane-head">
            <button type="button" className="btn" onClick={() => fileRef.current?.click()} title="Open file (⌘O) — or drop a file anywhere">
              <IconUpload /> Open
            </button>
            <input ref={fileRef} type="file" accept=".json,.geojson,.jsonl,application/json,text/plain" hidden onChange={(e) => { loadFile(e.target.files?.[0]); e.target.value = ""; }} />
            <label className="select-wrap">
              <span className="sr-only">Load a sample</span>
              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id === "large") {
                    loadText(generateLarge(2.6 * 1024 * 1024));
                    toast("Generated a large document");
                  } else {
                    const s = samples.find((x) => x.id === id);
                    if (s) loadText(s.text());
                  }
                  setMobilePane("view");
                }}
              >
                <option value="" disabled>
                  Samples
                </option>
                {samples.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
                <option value="large">Large (~5 MB)</option>
              </select>
            </label>
            <span className="pane-spacer" />
            <button type="button" className="icon-btn" onClick={() => format()} title="Format (⇧⌘F)" aria-label="Format" disabled={!outcome?.ok}>
              <IconWand />
            </button>
            <button type="button" className="icon-btn" onClick={() => format("min")} title="Minify" aria-label="Minify" disabled={!outcome?.ok}>
              <IconMinify />
            </button>
            <button type="button" className="icon-btn" onClick={unescapeNested} title="Expand stringified JSON inside string values" aria-label="Expand stringified JSON" disabled={!outcome?.ok}>
              <span className="glyph">&quot;{"{}"}&quot;</span>
            </button>
            <button type="button" className="icon-btn" onClick={() => copyText(text, "Copied input")} title="Copy input" aria-label="Copy input">
              <IconCopy />
            </button>
            <button type="button" className="icon-btn" onClick={() => downloadText(text, "document.json")} title="Save as file" aria-label="Save as file">
              <IconDownload />
            </button>
            <button type="button" className="icon-btn" onClick={() => { loadText(""); editorRef.current?.focus(); }} title="Clear" aria-label="Clear input">
              <IconX />
            </button>
          </div>
          {text.length > EDIT_MAX && !forceEdit ? (
            <div className="big-input">
              <p className="welcome-title">{formatBytes(bytes)} document</p>
              <p>Too large to edit comfortably in the browser, so it isn&apos;t shown here. Every view on the right works on the full document.</p>
              <div className="welcome-actions">
                <button type="button" className="btn" onClick={() => copyText(text, "Copied input")}>
                  <IconCopy /> Copy
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setForceEdit(true)} title="Can freeze the tab for several seconds">
                  Edit anyway (slow)
                </button>
              </div>
            </div>
          ) : (
            <Editor ref={editorRef} value={text} onChange={(t) => setTextRaw(t)} error={error} label="JSON input" placeholder="Paste JSON, drop a file, or press ⌘O" />
          )}
          {error && (
            <button type="button" className="error-bar" onClick={goToError}>
              <span className="error-loc">
                Ln {error.line}, Col {error.column}
              </span>
              <span className="error-msg">{error.message}</span>
              <span className="error-jump">Jump</span>
            </button>
          )}
        </section>
        <div className="resizer hide-mobile" onPointerDown={startResize} role="separator" aria-orientation="vertical" aria-label="Resize input" />

        <section className="view-pane" aria-label="Visualisation">
          <div className="view-head">
            <nav className="tabs" role="tablist" aria-label="Views">
              {VIEWS.map((v) => (
                <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={view === v.id ? "on" : ""} onClick={() => setView(v.id)} title={`${v.label} (${v.key})`}>
                  {v.label}
                </button>
              ))}
            </nav>
            {error && hasDoc && <span className="stale">Showing last valid version</span>}
          </div>

          {hasDoc && view !== "diff" && (
            <div className="crumbbar">
              <nav className="crumbs" aria-label="Selected path">
                {selCrumbs.map((c, i) => (
                  <span key={c.id} className="crumb-wrap">
                    {i > 0 && !c.isIndex && <span className="crumb-sep">.</span>}
                    <button type="button" className={`crumb${i === selCrumbs.length - 1 ? " current" : ""}`} onClick={() => reveal(c.id)}>
                      {c.label}
                    </button>
                  </span>
                ))}
              </nav>
              {selType && (
                <span className={`type-pill ty-${selType}`}>
                  {selType}
                  {selSize && <em>{selSize}</em>}
                </span>
              )}
              <span className="crumb-actions">
                <button type="button" className="btn btn-quiet" onClick={() => copyText(toJsonPath(doc, selected), "Copied JSONPath")} title={toJsonPath(doc, selected)}>
                  <IconPath /> Path
                </button>
                <button type="button" className="btn btn-quiet hide-mobile" onClick={() => copyText(toJsAccessor(doc, selected), "Copied JS accessor")} title={toJsAccessor(doc, selected)}>
                  JS
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => copyText(stringify(sel.value, indent === "min" ? "min" : indent), "Copied value")}>
                  <IconCopy /> Value
                </button>
              </span>
            </div>
          )}

          <div className="view-body">
            {!ready ? null : !hasDoc ? (
              <div className="empty-view">
                {text.trim() === "" ? (
                  <div className="welcome">
                    <p className="welcome-title">Paste JSON, drop a file, or open one.</p>
                    <p>Everything runs in this tab. Nothing is uploaded.</p>
                    <div className="welcome-actions">
                      <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
                        <IconUpload /> Open file
                      </button>
                      {samples.slice(0, 3).map((s) => (
                        <button key={s.id} type="button" className="btn btn-quiet" onClick={() => loadText(s.text())}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : error ? (
                  <div className="welcome">
                    <p className="welcome-title">This isn&apos;t valid JSON yet.</p>
                    <p>
                      Line {error.line}, column {error.column}: {error.message}
                    </p>
                    <button type="button" className="btn" onClick={goToError}>
                      Go to error
                    </button>
                  </div>
                ) : (
                  <div className="welcome">Parsing…</div>
                )}
              </div>
            ) : view === "tree" ? (
              <TreeView doc={doc} expansion={expansion} setExpansion={setExpansion} selected={selected} onSelect={setSelected} reveal={reveal} revealNonce={revealNonce} query={query} setQuery={setQuery} />
            ) : view === "table" ? (
              <TableView doc={doc} selected={selected} onSelect={setSelected} />
            ) : view === "graph" ? (
              <GraphView doc={doc} selected={selected} onSelect={setSelected} onReveal={revealInTree} />
            ) : view === "raw" ? (
              <RawView doc={doc} selected={selected} indent={indent} setIndent={setIndent} />
            ) : (
              <DiffView doc={doc} textB={textB} setTextB={setTextB} onReveal={revealInTree} />
            )}
          </div>
        </section>
      </main>

      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          <div>Drop a JSON file to open it</div>
        </div>
      )}

      {showKeys && (
        <div className="modal-backdrop" onClick={() => setShowKeys(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>Keyboard</span>
              <button type="button" className="icon-btn" onClick={() => setShowKeys(false)} aria-label="Close" autoFocus>
                <IconX />
              </button>
            </div>
            <dl className="keys">
              {[
                ["1 – 5", "Switch view"],
                ["↑ ↓  /  j k", "Move through the tree"],
                ["→ ←  /  l h", "Expand / collapse, go to parent"],
                ["Enter", "Toggle node"],
                ["*", "Expand everything under the node"],
                ["/", "Search (in the tree)"],
                ["Enter / ⇧Enter", "Next / previous match"],
                ["⌘C", "Copy the selected value (tree focused)"],
                ["⌘O", "Open a file"],
                ["⇧⌘F", "Format input"],
                ["⌘\\", "Toggle input pane"],
              ].map(([k, d]) => (
                <div key={k}>
                  <dt>
                    <kbd>{k}</kbd>
                  </dt>
                  <dd>{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
      <Toaster />
    </div>
  );
}
