import { typeOf, type JsonType } from "./json";

// Infers a JSON Schema (2020-12) by merging every value seen at each position,
// so an array of objects yields one item schema with an accurate `required`.

interface Shape {
  types: Set<JsonType>;
  objects: number; // how many object values were merged here
  props: Map<string, { shape: Shape; seen: number }>;
  items: Shape | null;
  integerOnly: boolean;
}

const newShape = (): Shape => ({ types: new Set(), objects: 0, props: new Map(), items: null, integerOnly: true });

function absorb(shape: Shape, value: unknown, depth: number) {
  const t = typeOf(value);
  shape.types.add(t);
  if (t === "number" && !Number.isInteger(value)) shape.integerOnly = false;
  if (depth > 200) return;
  if (t === "array") {
    shape.items ??= newShape();
    for (const v of value as unknown[]) absorb(shape.items, v, depth + 1);
  } else if (t === "object") {
    shape.objects++;
    for (const k of Object.keys(value as object)) {
      let p = shape.props.get(k);
      if (!p) shape.props.set(k, (p = { shape: newShape(), seen: 0 }));
      p.seen++;
      absorb(p.shape, (value as Record<string, unknown>)[k], depth + 1);
    }
  }
}

function emit(shape: Shape): Record<string, unknown> {
  const types = [...shape.types].map((t) => (t === "number" && shape.integerOnly ? "integer" : t));
  const out: Record<string, unknown> = {};
  if (types.length === 1) out.type = types[0];
  else if (types.length > 1) out.type = types;
  if (shape.types.has("object")) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [k, p] of shape.props) {
      Object.defineProperty(properties, k, { value: emit(p.shape), enumerable: true, writable: true, configurable: true });
      if (p.seen === shape.objects) required.push(k);
    }
    out.properties = properties;
    if (required.length) out.required = required;
  }
  if (shape.types.has("array")) out.items = shape.items && shape.items.types.size ? emit(shape.items) : {};
  return out;
}

export function inferSchema(value: unknown): Record<string, unknown> {
  const root = newShape();
  absorb(root, value, 0);
  return { $schema: "https://json-schema.org/draft/2020-12/schema", ...emit(root) };
}
