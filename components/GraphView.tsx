"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildGraph, CARD_W, HEADER_H, ROW_H, type Card } from "@/lib/graph";
import { containerScope, crumbs, getAt, toJsonPath } from "@/lib/json";
import { IconFocus } from "./Icons";

interface Props {
  doc: unknown;
  selected: string;
  onSelect: (id: string) => void;
  onReveal: (id: string) => void;
}

const DEPTHS = [2, 3, 5, 8, Infinity];

function titleFor(doc: unknown, id: string) {
  const c = crumbs(doc, id);
  return c[c.length - 1].label;
}

export function GraphView({ doc, selected, onSelect, onReveal }: Props) {
  const [root, setRoot] = useState(() => containerScope(doc, selected));
  const [maxDepth, setMaxDepth] = useState(3);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 24, y: 24, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  // Re-root when the selection leaves the drawn subtree (e.g. breadcrumb click on an ancestor).
  useEffect(() => {
    if (!getAt(doc, root).found || !(selected === root || selected.startsWith(root + "/"))) setRoot(containerScope(doc, selected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, doc]);

  const graph = useMemo(() => {
    const { value } = getAt(doc, root);
    return buildGraph(value, root, titleFor(doc, root), { maxDepth, maxCards: 400, maxRows: 14 });
  }, [doc, root, maxDepth]);

  const fit = () => {
    const el = wrapRef.current;
    if (!el || !graph.cards.length) return;
    const pad = 32;
    const k = Math.min(1, (el.clientWidth - pad * 2) / Math.max(1, graph.width), (el.clientHeight - pad * 2) / Math.max(1, graph.height));
    const kk = Math.max(0.2, k);
    setView({ k: kk, x: pad, y: Math.max(pad, (el.clientHeight - graph.height * kk) / 2) });
  };

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // start readable (not tiny): fit only when it doesn't shrink below 0.7
    const k = Math.min(1, (el.clientWidth - 64) / Math.max(1, graph.width), (el.clientHeight - 64) / Math.max(1, graph.height));
    if (k >= 0.7) setView({ k, x: 32, y: Math.max(32, (el.clientHeight - graph.height * k) / 2) });
    else setView({ k: 0.85, x: 32, y: 32 });
  }, [graph]);

  // wheel: zoom around cursor (ctrl/cmd or pinch), otherwise pan
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        setView((v) => {
          const k = Math.min(2.5, Math.max(0.15, v.k * Math.exp(-e.deltaY * 0.01)));
          return { k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k };
        });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (f: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const mx = el.clientWidth / 2;
    const my = el.clientHeight / 2;
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.15, v.k * f));
      return { k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k };
    });
  };

  // cull cards outside the viewport
  const [size, setSize] = useState({ w: 1200, h: 800 });
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const vis = (c: Card) => {
    const x = c.x * view.k + view.x;
    const y = c.y * view.k + view.y;
    return x + CARD_W * view.k > -50 && x < size.w + 50 && y + c.h * view.k > -50 && y < size.h + 50;
  };

  const selectedCard = graph.cards.find((c) => c.id === selected);

  return (
    <div className="view graph-view">
      <div className="toolbar">
        <span className="toolbar-meta">
          {graph.cards.length.toLocaleString("en-US")} nodes{graph.truncated && " · limited"} · root <code>{toJsonPath(doc, root)}</code>
        </span>
        <div className="seg" role="group" aria-label="Graph depth">
          {DEPTHS.map((d) => (
            <button key={d} type="button" className={maxDepth === d ? "on" : ""} onClick={() => setMaxDepth(d)} title={d === Infinity ? "No depth limit (node budget still applies)" : `Show ${d} levels`}>
              {d === Infinity ? "All" : d}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Zoom">
          <button type="button" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={fit} title="Fit to screen">
            Fit
          </button>
          <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
            +
          </button>
        </div>
        <button type="button" className="btn" disabled={!selectedCard || selected === root} onClick={() => setRoot(selected)} title="Draw the graph from the selected node">
          <IconFocus /> Focus
        </button>
        {root !== "" && (
          <button type="button" className="btn" onClick={() => { setRoot(""); onSelect(""); }}>
            Root
          </button>
        )}
      </div>
      <div
        ref={wrapRef}
        className="graph-canvas"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
          if (!d.moved) (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          d.moved = true;
          setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
        }}
        onPointerUp={() => {
          setTimeout(() => (drag.current = null), 0);
        }}
      >
        <svg width="100%" height="100%" role="img" aria-label="Graph of the JSON structure">
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {graph.edges.map((e, i) => {
              const a = graph.cards[e.from];
              const b = graph.cards[e.to];
              const x1 = a.x + CARD_W;
              const y1 = a.y + HEADER_H + e.row * ROW_H + ROW_H / 2 + 3;
              const x2 = b.x;
              const y2 = b.y + HEADER_H / 2;
              const mx = (x1 + x2) / 2;
              const active = b.id === selected || selected.startsWith(b.id + "/");
              return <path key={i} className={`edge${active ? " active" : ""}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} />;
            })}
            {graph.cards.filter(vis).map((c) => {
              const isSel = c.id === selected;
              return (
                <g key={c.id} transform={`translate(${c.x},${c.y})`} className={`card${isSel ? " is-selected" : ""}`}>
                  <rect className="card-bg" width={CARD_W} height={c.h} rx={7} />
                  <g
                    className="card-head"
                    onClick={() => !drag.current?.moved && onSelect(c.id)}
                    onDoubleClick={() => onReveal(c.id)}
                  >
                    <rect width={CARD_W} height={HEADER_H} rx={7} className="card-head-bg" />
                    <rect y={HEADER_H - 7} width={CARD_W} height={7} className="card-head-bg" />
                    <text x={10} y={17} className="card-title">
                      {c.title.length > 24 ? c.title.slice(0, 23) + "…" : c.title}
                    </text>
                    <text x={CARD_W - 10} y={17} className="card-count" textAnchor="end">
                      {c.type === "array" ? `[${c.count.toLocaleString("en-US")}]` : `{${c.count.toLocaleString("en-US")}}`}
                    </text>
                    <title>{`${toJsonPath(doc, c.id)} — click to select, double-click to open in tree`}</title>
                  </g>
                  {c.rows.map((r, i) => {
                    const y = HEADER_H + i * ROW_H + 3;
                    const rowId = r.childId ?? (r.more ? null : `${c.id}/${r.key.replace(/~/g, "~0").replace(/\//g, "~1")}`);
                    const keyText = r.key.length > 16 ? r.key.slice(0, 15) + "…" : r.key;
                    const maxVal = Math.max(6, 31 - keyText.length);
                    const val = r.text.length > maxVal ? r.text.slice(0, maxVal - 1) + "…" : r.text;
                    return (
                      <g
                        key={i}
                        transform={`translate(0,${y})`}
                        className={`card-row${rowId === selected ? " is-selected" : ""}${r.more ? " more" : ""}`}
                        onClick={() => {
                          if (drag.current?.moved || !rowId) return;
                          if (r.childCard !== null) onSelect(graph.cards[r.childCard].id);
                          else if (r.childId) setRoot(r.childId);
                          else onSelect(rowId);
                        }}
                      >
                        <rect width={CARD_W} height={ROW_H} className="card-row-bg" />
                        {r.more ? (
                          <text x={10} y={14} className="t-count">
                            {r.text}
                          </text>
                        ) : (
                          <>
                            <text x={10} y={14} className={/^\d+$/.test(r.key) && c.type === "array" ? "t-index" : "t-key"}>
                              {keyText}
                            </text>
                            <text x={CARD_W - 10} y={14} textAnchor="end" className={`t-${r.type}${r.childId ? " t-link" : ""}`}>
                              {val}
                            </text>
                          </>
                        )}
                        {r.childId && r.childCard !== null && <circle cx={CARD_W} cy={ROW_H / 2} r={3} className="port" />}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
        {graph.cards.length === 0 && <div className="empty-inline">Nothing to draw — select an object or array.</div>}
        <div className="graph-hint">Drag to pan · ⌘/Ctrl + scroll to zoom · click a nested row to follow it</div>
      </div>
    </div>
  );
}
