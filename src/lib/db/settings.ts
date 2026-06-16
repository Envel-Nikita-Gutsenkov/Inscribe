import { db } from "./connection";

export function getSystemSetting(key: string, defaultValue: string): string {
  try {
    const row = db.prepare("SELECT value FROM system_settings WHERE key = ?").get(key) as { value: string } | undefined;
    return row ? row.value : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setSystemSetting(key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)").run(key, value);
}
