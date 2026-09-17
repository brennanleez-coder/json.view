"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { containerScope, getAt, isContainer, parentId, preview, toJsonPath } from "@/lib/json";
import { buildTable, filterRows, findRecordArrays, LABEL_COL, sortRows, VALUE_COL, type Column } from "@/lib/table";
import { useVirtual } from "./useVirtual";
import { ValueText } from "./TreeView";
import { IconSearch, IconUp, IconX } from "./Icons";

const ROW_H = 28;
const LABEL_W = 72;

interface Props {
  doc: unknown;
  selected: string;
  onSelect: (id: string) => void;
}

const TYPE_ABBR: Record<string, string> = { string: "str", number: "num", boolean: "bool", null: "null", object: "obj", array: "arr" };

/** Where to open the table: nearest array of records at or above the selection. */
function initialScope(doc: unknown, selected: string): string {
  let cur: string | null = selected;
  while (cur !== null) {
    const { value } = getAt(doc, cur);
    if (Array.isArray(value) && value.length && value.filter((v) => isContainer(v) && !Array.isArray(v)).length / value.length >= 0.5) return cur;
    cur = parentId(cur);
  }
  // nothing tabular above the selection: open the shallowest table inside it, if any
  const scope = containerScope(doc, selected);
  const inside = findRecordArrays(getAt(doc, scope).value, 1)[0];
  return inside ? scope + inside.id : scope;
}

export function TableView({ doc, selected, onSelect }: Props) {
  const [scope, setScope] = useState(() => initialScope(doc, selected));
  const [sort, setSort] = useState<{ col: string | null; dir: 1 | -1 }>({ col: null, dir: 1 });
  const [filter, setFilter] = useState("");

  // Follow the selection unless it is a row or cell of the current table.
  const prevSelected = useRef(selected);
  useEffect(() => {
    if (prevSelected.current === selected && getAt(doc, scope).found) return; // mount or doc edit
    prevSelected.current = selected;
    const within = selected === scope || (selected.startsWith(scope + "/") && selected.slice(scope.length).split("/").length - 1 <= 2);
    if (!within || !getAt(doc, scope).found) {
      setScope(containerScope(doc, selected));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, doc]);

  useEffect(() => {
    setSort({ col: null, dir: 1 });
    setFilter("");
  }, [scope]);

  const scopeValue = getAt(doc, scope).value;
  const model = useMemo(() => buildTable(scopeValue, scope), [scopeValue, scope]);
  const candidates = useMemo(() => findRecordArrays(doc), [doc]);
  const rows = useMemo(() => (model ? filterRows(sortRows(model.rows, sort.col, sort.dir), filter.trim()) : []), [model, sort, filter]);
  const v = useVirtual(rows.length, ROW_H);

  if (!model) return <div className="view empty-view">Select an object or array to see it as a table.</div>;

  const cols = model.columns;
  const labelHeader = model.kind === "entries" ? "key" : "#";
  const gridWidth = LABEL_W + cols.reduce((n, c) => n + c.width, 0) + (model.kind === "entries" ? 120 : 0);
  const labelW = model.kind === "entries" ? LABEL_W + 120 : LABEL_W;

  const clickSort = (col: string) =>
    setSort((s) => (s.col !== col ? { col, dir: 1 } : s.dir === 1 ? { col, dir: -1 } : { col: null, dir: 1 }));

  const drill = (id: string) => {
    setScope(id);
    onSelect(id);
  };

  const headerCell = (c: Column) => (
    <button
      type="button"
      key={c.key}
      className={`th${sort.col === c.key ? " sorted" : ""}`}
      style={{ width: c.width }}
      onClick={() => clickSort(c.key)}
      title={`${c.label} — ${c.types.join(" | ")}${c.presence < 1 ? ` — present in ${Math.round(c.presence * 100)}% of rows` : ""}`}
      aria-sort={sort.col === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
    >
      <span className="th-label">{c.key === VALUE_COL && model.kind !== "records" ? "value" : c.label}</span>
      <span className="th-meta">
        {c.types.slice(0, 2).map((t) => TYPE_ABBR[t]).join("|")}
        {c.presence < 1 && <span className="th-presence"> {Math.round(c.presence * 100)}%</span>}
      </span>
      {sort.col === c.key && <IconUp className={`sort-icon${sort.dir === -1 ? " desc" : ""}`} width={12} height={12} />}
    </button>
  );

  const items = [];
  for (let i = v.start; i < v.end; i++) {
    const r = rows[i];
    items.push(
      <div key={r.id} className={`tr${r.id === selected ? " is-selected" : ""}`} style={{ top: i * ROW_H, width: gridWidth }} role="row">
        <button type="button" className="td td-label" style={{ width: labelW }} onClick={() => onSelect(r.id)} title={toJsonPath(doc, r.id)}>
          {r.label}
        </button>
        {cols.map((c) => {
          const cell = r.cells.get(c.key);
          if (!cell) return <span key={c.key} className="td td-missing" style={{ width: c.width }} />;
          const nested = isContainer(cell.value);
          const sel = cell.id === selected && cell.id !== r.id;
          if (nested) {
            const arr = Array.isArray(cell.value);
            const n = arr ? (cell.value as unknown[]).length : Object.keys(cell.value as object).length;
            return (
              <button
                type="button"
                key={c.key}
                className={`td td-nested${sel ? " is-selected" : ""}`}
                style={{ width: c.width }}
                onClick={() => (n ? drill(cell.id) : onSelect(cell.id))}
                title={`Open ${toJsonPath(doc, cell.id)}\n${preview(cell.value, 200)}`}
              >
                <span className="chip">{arr ? `[${n}]` : `{${n}}`}</span>
                <span className="td-preview">{preview(cell.value, 60).slice(1, -1)}</span>
              </button>
            );
          }
          return (
            <button type="button" key={c.key} className={`td${sel ? " is-selected" : ""}`} style={{ width: c.width }} onClick={() => onSelect(cell.id)} title={typeof cell.value === "string" && cell.value.length > 30 ? cell.value.slice(0, 500) : undefined}>
              <ValueText value={cell.value} q={filter.trim()} max={200} />
            </button>
          );
        })}
      </div>,
    );
  }

  return (
    <div className="view table-view">
      <div className="toolbar">
        <div className="search">
          <IconSearch className="search-icon" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter rows" aria-label="Filter rows" spellCheck={false} />
          {filter && (
            <button type="button" className="icon-btn" onClick={() => setFilter("")} aria-label="Clear filter">
              <IconX />
            </button>
          )}
        </div>
        <span className="toolbar-meta">
          {rows.length !== model.rows.length && `${rows.length.toLocaleString("en-US")} of `}
          {model.rows.length.toLocaleString("en-US")} {model.kind === "entries" ? "keys" : "rows"}
          {model.kind === "records" && ` · ${cols.length} columns`}
        </span>
        {candidates.length > 0 && (
          <label className="select-wrap">
            <span className="sr-only">Jump to table</span>
            <select value={candidates.some((c) => c.id === scope) ? "@" + scope : "none"} onChange={(e) => drill(e.target.value.slice(1))}>
              <option value="none" disabled>
                Tables in document ({candidates.length})
              </option>
              {candidates.map((c) => (
                <option key={c.id} value={"@" + c.id}>
                  {toJsonPath(doc, c.id)} · {c.rows.toLocaleString("en-US")} rows
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div ref={v.ref} className="scroller table-scroller" data-sticky-offset={34} role="table" aria-rowcount={rows.length}>
        <div className="thead" style={{ width: gridWidth }} role="row">
          <button type="button" className={`th th-corner${sort.col === LABEL_COL ? " sorted" : ""}`} style={{ width: labelW }} onClick={() => clickSort(LABEL_COL)}>
            <span className="th-label">{labelHeader}</span>
            {sort.col === LABEL_COL && <IconUp className={`sort-icon${sort.dir === -1 ? " desc" : ""}`} width={12} height={12} />}
          </button>
          {cols.map(headerCell)}
        </div>
        <div style={{ height: v.total, position: "relative", width: gridWidth }}>{items}</div>
        {rows.length === 0 && <div className="empty-inline">{filter ? "No rows match the filter." : "Empty."}</div>}
      </div>
    </div>
  );
}
