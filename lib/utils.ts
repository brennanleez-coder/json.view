import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Cleans JSON with escaped characters by detecting and parsing nested JSON strings
 * @param jsonString - The JSON string that may contain escaped JSON
 * @param expandStringified - Whether to expand stringified JSON fields into objects
 * @returns The cleaned JSON string
 */
export function cleanEscapedJson(jsonString: string, expandStringified: boolean = false): string {
  try {
    const parsed = JSON.parse(jsonString);
    
    if (expandStringified) {
      const expandStringifiedFields = (obj: any): any => {
        if (typeof obj === 'string') {
          const trimmed = obj.trim();
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
              (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              const parsed = JSON.parse(obj);
              return expandStringifiedFields(parsed);
            } catch {
              return obj;
            }
          }
          return obj;
        } else if (Array.isArray(obj)) {
          return obj.map(expandStringifiedFields);
        } else if (obj !== null && typeof obj === 'object') {
          const result: any = {};
          for (const [key, value] of Object.entries(obj)) {
            result[key] = expandStringifiedFields(value);
          }
          return result;
        }
        return obj;
      };
      
      const expanded = expandStringifiedFields(parsed);
      return JSON.stringify(expanded, null, 2);
    }
    
    return JSON.stringify(parsed, null, 2);
  } catch {
    let cleaned = jsonString;
    
    const escapedJsonRegex = /"([^"]*(?:\\"[^"]*)*)"/g;
    let match;
    
    while ((match = escapedJsonRegex.exec(jsonString)) !== null) {
      const fullMatch = match[0];
      const stringValue = match[1];
      
      if (stringValue.includes('\\"') && (stringValue.includes('{') || stringValue.includes('['))) {
        try {
          const unescaped = stringValue.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          const parsed = JSON.parse(unescaped);
          
          const cleanedValue = JSON.stringify(parsed, null, 2);
          cleaned = cleaned.replace(fullMatch, JSON.stringify(cleanedValue));
        } catch {
          continue;
        }
      }
    }
    
    return cleaned;
  }
}

export function generateJsonSchema(obj: any): any {
  if (obj === null) {
    return { type: "null" };
  }

  if (typeof obj === "string") {
    return { type: "string" };
  }

  if (typeof obj === "number") {
    return { type: "number" };
  }

  if (typeof obj === "boolean") {
    return { type: "boolean" };
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return { type: "array", items: {} };
    }

    // Get schema from first item
    const firstItemSchema = generateJsonSchema(obj[0]);
    
    return {
      type: "array",
      items: firstItemSchema
    };
  }

  if (typeof obj === "object" && obj !== null) {
    const properties: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      properties[key] = generateJsonSchema(value);
    }

    return {
      type: "object",
      properties
    };
  }

  return { type: "object" };
}
