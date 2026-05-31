export function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Empty response from AI.");
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("No JSON object found in AI response.");
}

export function parseJsonResponse<T>(raw: string): T {
  return JSON.parse(extractJsonCandidate(raw)) as T;
}

export function parseRequestJson<T>(raw: string): T {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error("Request body is empty.");
  }

  return JSON.parse(trimmed) as T;
}
