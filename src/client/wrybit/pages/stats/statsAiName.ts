// Keep the AI suffix readable in narrow stats cells; stats never control AI.
const CURRENT_MARKER_PATTERN = /^(.*?)\s*(\[AI[-+]?\])$/;

export function splitAiMarker(displayName: string): {name: string, marker: string | undefined} {
  const match = CURRENT_MARKER_PATTERN.exec(displayName);
  return match === null ? {name: displayName, marker: undefined} : {name: match[1], marker: match[2]};
}
