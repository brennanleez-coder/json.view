"use client";

import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { childId, flatten, getAt, parentId, preview, search, type Expansion, type Row } from "@/lib/json";
import { IconChevron, IconDown, IconSearch, IconUp, IconX } from "./Icons";
import { useVirtual } from "./useVirtual";
import { copyText } from "./Toast";

const ROW_H = 24;
const INDENT = 16;
const ROW_LIMIT = 1_000_000;

interface Props {
  doc: unknown;
  expansion: Expansion;
  setExpansion: (fn: (e: Expansion) => Expansion) => void;
  selected: string;
  onSelect: (id: string) => void;
  reveal: (id: string) => void;
  revealNonce: number;
  query: string;
  setQuery: (q: string) => void;
}

const COLOR_RE = /^(#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i;

export function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  for (let j = lower.indexOf(needle); j !== -1 && k < 20; j = lower.indexOf(needle, i), k++) {
    if (j > i) parts.push(text.slice(i, j));
    parts.push(<mark key={j}>{text.slice(j, j + needle.length)}</mark>);
    i = j + needle.length;
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
}

export function ValueText({ value, q = "", max = 400 }: { value: unknown; q?: string; max?: number }) {
  if (typeof value === "string") {
    const shown = value.length > max ? value.slice(0, max) + "…" : value;
    const swatch = value.length < 40 && COLOR_RE.test(value.trim());
    return (
      <span className="t-string">
        {swatch && <span className="swatch" style={{ background: value.trim() }} />}"
        <Highlight text={JSON.stringify(shown).slice(1, -1)} q={q} />"
      </span>
    );
  }
  if (value === null) return <span className="t-null"><Highlight text="null" q={q} /></span>;
  if (typeof value === "number") return <span className="t-number"><Highlight text={String(value)} q={q} /></span>;
  if (typeof value === "boolean") return <span className="t-boolean"><Highlight text={String(value)} q={q} /></span>;
  return null;
}

interface RowProps {
  row: Row;
  index: number;
  top: number;
  selected: boolean;
  isMatch: boolean;
  isCurrent: boolean;
  isArrayChild: boolean;
  q: string;
  onToggle: (row: Row) => void;
  onSelect: (id: string) => void;
}

const TreeRow = memo(function TreeRow({ row, index, top, selected, isMatch, isCurrent, isArrayChild, q, onToggle, onSelect }: RowProps) {
  const arr = Array.isArray(row.value);
  return (
    <div
      id={`tree-row-${index}`}
      role="treeitem"
      aria-level={row.depth + 1}
      aria-expanded={row.container ? row.expanded : undefined}
      aria-selected={selected}
      className={`tree-row${selected ? " is-selected" : ""}${isMatch ? " is-match" : ""}${isCurrent ? " is-current" : ""}`}
      style={{ top, paddingLeft: row.depth * INDENT + 6 }}
      onMouseDown={(e) => {
        if (e.detail > 1) e.preventDefault(); // no text selection on double click
      }}
      onClick={() => onSelect(row.id)}
      onDoubleClick={() => row.container && onToggle(row)}
    >
      {row.depth > 0 && <span className="guides" style={{ width: row.depth * INDENT }} />}
      {row.container ? (
        <button
          type="button"
          tabIndex={-1}
          className={`chev${row.expanded ? " open" : ""}`}
          aria-label={row.expanded ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(row);
          }}
        >
          <IconChevron width={12} height={12} />
        </button>
      ) : (
        <span className="chev-space" />
      )}
      {row.key === null ? (
        <span className="t-root">$</span>
      ) : isArrayChild ? (
        <span className="t-index">{row.key}</span>
      ) : (
        <span className="t-key">
          <Highlight text={String(row.key)} q={q} />
        </span>
      )}
      <span className="t-colon">:</span>
      {row.container ? (
        <>
          <span className="t-bracket">{arr ? "[" : "{"}</span>
          {!row.expanded && row.count > 0 && <span className="t-preview">{preview(row.value, 120).slice(1, -1)}</span>}
          {(!row.expanded || row.count === 0) && <span className="t-bracket">{arr ? "]" : "}"}</span>}
          <span className="t-count">
            {row.count.toLocaleString("en-US")} {arr ? (row.count === 1 ? "item" : "items") : row.count === 1 ? "key" : "keys"}
          </span>
        </>
      ) : (
        <span className="t-val">
          <ValueText value={row.value} q={q} />
        </span>
      )}
    </div>
  );
});

export function TreeView({ doc, expansion, setExpansion, selected, onSelect, reveal, revealNonce, query, setQuery }: Props) {
  const rows = useMemo(() => flatten(doc, expansion, ROW_LIMIT), [doc, expansion]);
  const v = useVirtual(rows.length, ROW_H);

  // ---- search (debounced)
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), query.length < 2 ? 250 : 120);
    return () => clearTimeout(t);
  }, [query]);
  const results = useMemo(() => search(doc, debounced.trim()), [doc, debounced]);
  const matchSet = useMemo(() => new Set(results.ids), [results]);
  const [cursor, setCursor] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const goMatch = (i: number) => {
    const n = results.ids.length;
    if (!n) return;
    const idx = ((i % n) + n) % n;
    setCursor(idx);
    reveal(results.ids[idx]);
  };

  useEffect(() => {
    setCursor(0);
    if (results.ids.length) reveal(results.ids[0]);
    // only when the query itself changes, not on every document edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // ---- keep the selection in view when it changes or is revealed
  const selIndex = useMemo(() => rows.findIndex((r) => r.id === selected), [rows, selected]);
  useEffect(() => {
    if (selIndex >= 0) v.scrollToIndex(selIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, revealNonce]);

  const setOverride = (id: string, open: boolean) =>
    setExpansion((e) => {
      const overrides = new Map(e.overrides);
      overrides.set(id, open);
      return { ...e, overrides };
    });

  const toggleRef = useRef((row: Row) => setOverride(row.id, !row.expanded));
  toggleRef.current = (row: Row) => setOverride(row.id, !row.expanded);
  const onToggle = useMemo(() => (row: Row) => toggleRef.current(row), []);

  const expandSubtree = (id: string) => {
    const { value } = getAt(doc, id);
    setExpansion((e) => {
      const overrides = new Map(e.overrides);
      const stack: [unknown, string][] = [[value, id]];
      let n = 0;
      while (stack.length && n < 200_000) {
        const [val, vid] = stack.pop()!;
        if (val === null || typeof val !== "object") continue;
        overrides.set(vid, true);
        n++;
        if (Array.isArray(val)) val.forEach((c, i) => stack.push([c, childId(vid, i)]));
        else for (const k of Object.keys(val)) stack.push([(val as Record<string, unknown>)[k], childId(vid, k)]);
      }
      return { ...e, overrides };
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!rows.length) return;
    const i = selIndex < 0 ? 0 : selIndex;
    const row = rows[i];
    const go = (j: number) => {
      const k = Math.max(0, Math.min(rows.length - 1, j));
      onSelect(rows[k].id);
    };
    switch (e.key) {
      case "ArrowDown":
      case "j":
        go(selIndex < 0 ? 0 : i + 1);
        break;
      case "ArrowUp":
      case "k":
        go(i - 1);
        break;
      case "PageDown":
        go(i + v.viewportRows - 1);
        break;
      case "PageUp":
        go(i - v.viewportRows + 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(rows.length - 1);
        break;
      case "ArrowRight":
      case "l":
        if (row.container && !row.expanded && row.count) setOverride(row.id, true);
        else if (row.container && row.expanded && row.count) go(i + 1);
        break;
      case "ArrowLeft":
      case "h":
        if (row.container && row.expanded) setOverride(row.id, false);
        else {
          const p = parentId(row.id);
          if (p !== null) onSelect(p);
        }
        break;
      case "Enter":
      case " ":
        if (row.container) setOverride(row.id, !row.expanded);
        break;
      case "*":
        if (row.container) expandSubtree(row.id);
        break;
      case "c":
        if (e.metaKey || e.ctrlKey) {
          if (window.getSelection()?.toString()) return;
          copyText(JSON.stringify(row.value, null, 2), "Copied value");
        } else return;
        break;
      case "/":
        searchRef.current?.focus();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const setDepth = (depth: number) => setExpansion(() => ({ depth, overrides: new Map() }));

  const q = debounced.trim();
  const currentId = results.ids[cursor];
  const items = [];
  for (let i = v.start; i < v.end; i++) {
    const row = rows[i];
    const pid = parentId(row.id);
    const isArrayChild = typeof row.key === "number";
    items.push(
      <TreeRow
        key={row.id}
        row={row}
        index={i}
        top={i * ROW_H}
        selected={row.id === selected}
        isMatch={matchSet.has(row.id)}
        isCurrent={row.id === currentId}
        isArrayChild={isArrayChild && pid !== null}
        q={q}
        onToggle={onToggle}
        onSelect={onSelect}
      />,
    );
  }

  const selValue = getAt(doc, selected);
  const longString = selValue.found && typeof selValue.value === "string" && selValue.value.length > 90 ? (selValue.value as string) : null;

  return (
    <div className="view tree-view">
      <div className="toolbar">
        <div className="search">
          <IconSearch className="search-icon" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                goMatch(cursor + (e.shiftKey ? -1 : 1));
              } else if (e.key === "Escape") {
                setQuery("");
              }
            }}
            placeholder="Search keys & values"
            aria-label="Search keys and values"
            spellCheck={false}
          />
          {q && (
            <>
              <span className="search-count" aria-live="polite">
                {results.ids.length ? `${cursor + 1}/${results.ids.length.toLocaleString("en-US")}${results.truncated ? "+" : ""}` : "0"}
              </span>
              <button type="button" className="icon-btn" onClick={() => goMatch(cursor - 1)} aria-label="Previous match" disabled={!results.ids.length}>
                <IconUp />
              </button>
              <button type="button" className="icon-btn" onClick={() => goMatch(cursor + 1)} aria-label="Next match" disabled={!results.ids.length}>
                <IconDown />
              </button>
              <button type="button" className="icon-btn" onClick={() => setQuery("")} aria-label="Clear search">
                <IconX />
              </button>
            </>
          )}
        </div>
        <div className="seg" role="group" aria-label="Expand to depth">
          <button type="button" onClick={() => setDepth(1)} className={expansion.depth === 1 && !expansion.overrides.size ? "on" : ""} title="Collapse all">
            Collapse
          </button>
          {[2, 3, 4].map((d) => (
            <button key={d} type="button" onClick={() => setDepth(d)} className={expansion.depth === d && !expansion.overrides.size ? "on" : ""} title={`Expand to depth ${d - 1}`}>
              {d - 1}
            </button>
          ))}
          <button type="button" onClick={() => setDepth(Infinity)} className={expansion.depth === Infinity && !expansion.overrides.size ? "on" : ""} title="Expand all">
            All
          </button>
        </div>
      </div>
      <div
        ref={v.ref}
        className="scroller tree-scroller"
        role="tree"
        tabIndex={0}
        aria-label="JSON tree"
        aria-activedescendant={selIndex >= v.start && selIndex < v.end ? `tree-row-${selIndex}` : undefined}
        onKeyDown={onKeyDown}
      >
        <div style={{ height: v.total, position: "relative", minWidth: "100%" }}>{items}</div>
      </div>
      {rows.length >= ROW_LIMIT && <div className="notice">Showing the first {ROW_LIMIT.toLocaleString("en-US")} rows. Collapse some nodes to see the rest.</div>}
      {longString !== null && (
        <div className="string-panel">
          <div className="string-panel-head">
            <span>string · {longString.length.toLocaleString("en-US")} chars</span>
            <button type="button" className="link-btn" onClick={() => copyText(longString, "Copied string")}>
              Copy raw
            </button>
          </div>
          <pre>{longString.length > 20000 ? longString.slice(0, 20000) + "\n…" : longString}</pre>
        </div>
      )}
    </div>
  );
}
