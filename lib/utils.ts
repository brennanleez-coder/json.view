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

/**
 * Encodes JSON data to be stored in URL parameters
 * @param json - The JSON object to encode
 * @returns URL-safe encoded string
 */
export function encodeJsonToUrl(json: any): string {
  try {
    const jsonString = JSON.stringify(json);
    return encodeURIComponent(jsonString);
  } catch (error) {
    console.error("Failed to encode JSON to URL:", error);
    return "";
  }
}

/**
 * Decodes JSON data from URL parameters
 * @param encodedJson - The URL-encoded JSON string
 * @returns Parsed JSON object or null if invalid
 */
export function decodeJsonFromUrl(encodedJson: string): any {
  try {
    const decodedString = decodeURIComponent(encodedJson);
    return JSON.parse(decodedString);
  } catch (error) {
    console.error("Failed to decode JSON from URL:", error);
    return null;
  }
}

/**
 * Updates the URL with encoded JSON data
 * @param json - The JSON object to encode and store in URL
 */
export function updateUrlWithJson(json: any): void {
  try {
    const encoded = encodeJsonToUrl(json);
    const url = new URL(window.location.href);
    
    if (encoded) {
      url.searchParams.set("json", encoded);
    } else {
      url.searchParams.delete("json");
    }
    
    // Use replaceState to avoid adding to browser history
    window.history.replaceState({}, "", url.toString());
  } catch (error) {
    console.error("Failed to update URL with JSON:", error);
  }
}

/**
 * Gets JSON data from URL parameters
 * @returns Parsed JSON object or null if not found/invalid
 */
export function getJsonFromUrl(): any {
  try {
    const url = new URL(window.location.href);
    const encodedJson = url.searchParams.get("json");
    
    if (!encodedJson) {
      return null;
    }
    
    return decodeJsonFromUrl(encodedJson);
  } catch (error) {
    console.error("Failed to get JSON from URL:", error);
    return null;
  }
}
