// Local request helper for the public statistics page. No retry/format magic:
// the page only needs an error message that can be shown in its error state.
export async function fetchOrFail(url: string): Promise<Response> {
  const response = await fetch(url, {headers: {Accept: 'application/json'}});
  if (!response.ok) {
    throw new Error(`Statistics request failed: ${response.status} ${response.statusText}`.trim());
  }
  return response;
}

export function failureOf(error: unknown): unknown {
  return error;
}

export function describeFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
