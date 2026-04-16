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
    cachedPresets = await resp.json();
    return cachedPresets || [];
  } catch {
    return [];
  }
}
