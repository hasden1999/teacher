/**
 * aiConfig.ts - Central AI Configuration for Iraqi Teacher Assistant
 */

// Load API key from Vite environment variable (VITE_GEMINI_API_KEY)
export const DEFAULT_CENTRAL_GEMINI_API_KEY: string =
  ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || '';

export const STORAGE_KEY_GEMINI_API_KEY = 'techeeer_gemini_api_key';

export function getActiveGeminiApiKey(): string {
  try {
    const sessionVal = sessionStorage.getItem(STORAGE_KEY_GEMINI_API_KEY);
    if (sessionVal && sessionVal.trim()) {
      return sessionVal.trim();
    }
  } catch {
    // storage unavailable
  }
  return DEFAULT_CENTRAL_GEMINI_API_KEY;
}

export function setActiveGeminiApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      sessionStorage.setItem(STORAGE_KEY_GEMINI_API_KEY, trimmed);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_GEMINI_API_KEY);
    }
    // Never persist secrets in localStorage for student privacy compliance
    localStorage.removeItem(STORAGE_KEY_GEMINI_API_KEY);
  } catch {
    // storage unavailable
  }
}
