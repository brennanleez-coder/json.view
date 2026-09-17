import { childCount, childId, isContainer, scalarText, typeOf, type JsonType } from "./json";

// Card-and-edge layout of a JSON subtree. Each container is a card listing its
// scalar fields; nested containers become child cards joined by edges.

export const CARD_W = 264;
export const HEADER_H = 26;
export const ROW_H = 20;
export const GAP_X = 72;
export const GAP_Y = 16;

export interface CardRow {
  key: string;
  text: string;
  type: JsonType;
  childCard: number | null; // index into cards
  childId: string | null; // pointer of the nested container (even if not drawn)
  more?: boolean; // "+N more" filler row
}

export interface Card {
  id: string;
  title: string;
  type: "object" | "array";
  count: number;
  depth: number;
  rows: CardRow[];
  children: number[];
  x: number;
  y: number;
  h: number;
}

export interface Edge {
  from: number;
  row: number;
  to: number;
}

export interface Graph {
  cards: Card[];
  edges: Edge[];
  width: number;
  height: number;
  truncated: boolean; // budget or depth hit somewhere
}

export interface GraphOptions {
  maxCards?: number;
  maxRows?: number;
  maxDepth?: number;
}

export function buildGraph(root: unknown, rootId: string, rootTitle: string, opts: GraphOptions = {}): Graph {
  const maxCards = opts.maxCards ?? 300;
  const maxRows = opts.maxRows ?? 14;
  const maxDepth = opts.maxDepth ?? Infinity;
  const cards: Card[] = [];
  const edges: Edge[] = [];
  let truncated = false;
  if (!isContainer(root)) return { cards, edges, width: 0, height: 0, truncated };

  const makeCard = (value: unknown, id: string, title: string, depth: number): number => {
    const arr = Array.isArray(value);
    cards.push({ id, title, type: arr ? "array" : "object", count: childCount(value), depth, rows: [], children: [], x: 0, y: 0, h: 0 });
    return cards.length - 1;
  };

  // BFS so the budget is spent on shallow structure first
  const queue: { idx: number; value: unknown }[] = [{ idx: makeCard(root, rootId, rootTitle, 0), value: root }];
  for (let q = 0; q < queue.length; q++) {
    const { idx, value } = queue[q];
    const card = cards[idx];
    const entries: [string, unknown, string][] = Array.isArray(value)
      ? value.slice(0, maxRows).map((v, i) => [`${i}`, v, childId(card.id, i)])
      : Object.keys(value as object)
          .slice(0, maxRows)
          .map((k) => [k, (value as Record<string, unknown>)[k], childId(card.id, k)]);
    for (const [key, v, cid] of entries) {
      const type = typeOf(v);
      if (isContainer(v)) {
        let child: number | null = null;
        if (card.depth + 1 <= maxDepth && cards.length < maxCards && childCount(v) > 0) {
          child = makeCard(v, cid, Array.isArray(value) ? `${card.title}[${key}]` : key, card.depth + 1);
          card.children.push(child);
          edges.push({ from: idx, row: card.rows.length, to: child });
          queue.push({ idx: child, value: v });
        } else if (childCount(v) > 0) {
          truncated = true;
        }
        const n = childCount(v);
        card.rows.push({ key, text: Array.isArray(v) ? `[${n}]` : `{${n}}`, type, childCard: child, childId: cid });
      } else {
        const s = scalarText(v);
        card.rows.push({ key, text: s.length > 60 ? s.slice(0, 59) + "…" : s, type, childCard: null, childId: null });
      }
    }
    if (card.count > entries.length) {
      card.rows.push({ key: "", text: `+${(card.count - entries.length).toLocaleString("en-US")} more`, type: "null", childCard: null, childId: null, more: true });
    }
    card.h = HEADER_H + Math.max(1, card.rows.length) * ROW_H + 6;
  }

  // Tidy layout, left to right. Iterative post-order.
  let cursor = 0;
  let width = 0;
  const startY = new Map<number, number>();
  const stack: { idx: number; visited: boolean }[] = [{ idx: 0, visited: false }];
  while (stack.length) {
    const top = stack[stack.length - 1];
    const card = cards[top.idx];
    card.x = card.depth * (CARD_W + GAP_X);
    width = Math.max(width, card.x + CARD_W);
    if (!top.visited) {
      top.visited = true;
      startY.set(top.idx, cursor);
      for (let i = card.children.length - 1; i >= 0; i--) stack.push({ idx: card.children[i], visited: false });
      continue;
    }
    stack.pop();
    const start = startY.get(top.idx)!;
    if (card.children.length === 0) {
      card.y = cursor;
    } else {
      // top-aligned with its first child: centring puts parents of long lists off-screen
      card.y = Math.max(start, cards[card.children[0]].y);
    }
    cursor = Math.max(cursor, card.y + card.h + GAP_Y);
  }
  return { cards, edges, width, height: Math.max(0, cursor - GAP_Y), truncated };
}
