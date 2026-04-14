export interface GamePreset {
  name: string;
  shortName?: string;
  description: string;
  settings: Record<string, unknown>;
}

let cachedPresets: Array<GamePreset> | undefined;

export async function loadPresets(): Promise<Array<GamePreset>> {
  if (cachedPresets) return cachedPresets;
  try {
    const resp = await fetch('/assets/default_templates.json');
    if (!resp.ok) {
      cachedPresets = [];
      return cachedPresets;
    }
    const parsed = await resp.json();
    cachedPresets = Array.isArray(parsed) ? parsed : [];
    return cachedPresets || [];
  } catch {
    return [];
  }
}
