export interface Sample {
  id: string;
  label: string;
  text: () => string;
}

const orders = () => {
  const statuses = ["paid", "pending", "refunded", "shipped"];
  const cities = ["Singapore", "Berlin", "Austin", "Osaka", "Lisbon", "Toronto"];
  return Array.from({ length: 48 }, (_, i) => ({
    id: `ord_${(1043 + i * 7).toString(36)}`,
    total: Math.round(((i * 37) % 900) + 12.5 * (i % 4)) / 1,
    currency: i % 5 === 0 ? "EUR" : "USD",
    status: statuses[(i * 3) % 4],
    items: (i % 4) + 1,
    customer: { name: `Customer ${i + 1}`, city: cities[i % cities.length], vip: i % 7 === 0 },
    ...(i % 6 === 0 ? { note: "leave at the door" } : {}),
    created_at: new Date(Date.UTC(2026, 7, 1 + (i % 28), 9 + (i % 9))).toISOString(),
  }));
};

export const samples: Sample[] = [
  {
    id: "api",
    label: "API response",
    text: () =>
      JSON.stringify(
        {
          ok: true,
          request_id: "req_7f3a91c2",
          data: {
            user: {
              id: 4812,
              handle: "ada",
              name: "Ada Lovelace",
              email: "ada@example.com",
              roles: ["admin", "billing"],
              theme: { accent: "#3b82f6", density: "compact" },
              last_seen: "2026-09-17T08:21:44Z",
              avatar: null,
            },
            usage: { period: "2026-09", requests: 184233, limit: 250000, ratio: 0.7369 },
            flags: { beta: true, legacy_export: false },
          },
          pagination: { cursor: "eyJwIjoyfQ", has_more: true },
        },
        null,
        2,
      ),
  },
  { id: "table", label: "Array of records", text: () => JSON.stringify(orders(), null, 2) },
  {
    id: "nested",
    label: "Deeply nested",
    text: () => {
      const make = (d: number): unknown =>
        d === 0 ? { leaf: true, value: d } : { level: d, label: `node-${d}`, children: [make(d - 1), { sibling: d, tags: ["a", "b"] }], meta: { depth: d } };
      return JSON.stringify(make(12), null, 2);
    },
  },
  {
    id: "invalid",
    label: "Broken JSON",
    text: () => '{\n  "name": "jsonlite",\n  "version": 2,\n  "features": ["tree", "table", "graph"]\n  "private": true,\n}\n',
  },
];

/** Deterministic large document for performance checks. */
export function generateLarge(targetBytes = 5 * 1024 * 1024): string {
  const rows: unknown[] = [];
  let size = 0;
  let i = 0;
  while (size < targetBytes) {
    const row = {
      id: i,
      uuid: `${(i * 2654435761) % 4294967296}`.padStart(10, "0"),
      name: `user_${i}`,
      active: i % 3 !== 0,
      score: (i * 7919) % 10007 / 100,
      tags: ["alpha", "beta", "gamma"].slice(0, (i % 3) + 1),
      address: { street: `${i} Market St`, city: ["Singapore", "Berlin", "Austin"][i % 3], geo: { lat: 1.29 + i / 1e5, lng: 103.85 - i / 1e5 } },
      history: [{ at: 1_700_000_000 + i, event: "login" }, { at: 1_700_000_500 + i, event: "purchase", amount: i % 500 }],
    };
    size += JSON.stringify(row).length + 4;
    rows.push(row);
    i++;
  }
  return JSON.stringify({ generated: true, count: rows.length, rows }, null, 2);
}
