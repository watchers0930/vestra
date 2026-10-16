import { GuestError } from "./errors";

/** JSON.parse accepts duplicate keys; reject them including escaped aliases. */
export function parseStrictJson(text: string): unknown {
  const value: unknown = JSON.parse(text);
  const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|[^\s{}\[\]:,]+/g) || [];
  const scopes: (Set<string> | null)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "{") scopes.push(new Set());
    else if (token === "[") scopes.push(null);
    else if (token === "}" || token === "]") scopes.pop();
    else if (token.startsWith('"') && tokens[i + 1] === ":") {
      const keys = scopes.at(-1);
      const key: string = JSON.parse(token);
      if (!keys || keys.has(key)) throw new GuestError("invalid_input");
      keys.add(key);
    }
  }
  return value;
}
