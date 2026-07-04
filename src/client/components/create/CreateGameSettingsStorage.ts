import {JSONObject} from '@/common/Types';
import {sanitizeSettingsForStorage} from './TemplateManager';

const SETTINGS_KEY = 'tm_last_settings';

function getLocalStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export class CreateGameSettingsStorage {
  constructor(private readonly storage?: Storage) {
  }

  private getStorage(): Storage | undefined {
    return this.storage ?? getLocalStorage();
  }

  public saveSettings(settings: JSONObject): void {
    const storage = this.getStorage();
    if (storage === undefined) {
      return;
    }
    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(sanitizeSettingsForStorage(settings)));
    } catch (err) {
      console.warn('Unable to save create game settings:', err);
    }
  }

  public loadSettings(): JSONObject | undefined {
    const storage = this.getStorage();
    if (storage === undefined) {
      return undefined;
    }
    try {
      const data = storage.getItem(SETTINGS_KEY);
      if (data === null) {
        return undefined;
      }
      const settings = JSON.parse(data) as JSONObject;
      const sanitized = sanitizeSettingsForStorage(settings);
      if (JSON.stringify(settings) !== JSON.stringify(sanitized)) {
        storage.setItem(SETTINGS_KEY, JSON.stringify(sanitized));
      }
      return sanitized;
    } catch (err) {
      console.warn('Unable to load create game settings:', err);
      return undefined;
    }
  }

  public clearSettings(): void {
    const storage = this.getStorage();
    if (storage === undefined) {
      return;
    }
    try {
      storage.removeItem(SETTINGS_KEY);
    } catch (err) {
      console.warn('Unable to clear create game settings:', err);
    }
  }
}
