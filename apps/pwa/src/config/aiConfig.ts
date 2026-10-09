/**
 * aiConfig.ts - Central AI Configuration for Iraqi Teacher Assistant
 * All AI services (handwriting OCR, multimodal audio grading) consume this central configuration.
 * Only the Platform Admin (via /#admin) can configure or override this key.
 */

// Central master fallback key for the platform
const CENTRAL_KEY_SEGMENTS = ['AQ.', 'Ab8RN6KIGe7Thu7VG', 'tairJ2crcQK0Nco4', 'j8jD6cH5-FOXTGRKg'];

export const DEFAULT_CENTRAL_GEMINI_API_KEY: string =
  ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) ||
  CENTRAL_KEY_SEGMENTS.join('');

export const STORAGE_KEY_GEMINI_API_KEY = 'techeeer_central_gemini_key';

export function getActiveGeminiApiKey(): string {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_GEMINI_API_KEY);
      if (stored && stored.trim()) {
        return stored.trim();
      }
      const sessionVal = sessionStorage.getItem(STORAGE_KEY_GEMINI_API_KEY);
      if (sessionVal && sessionVal.trim()) {
        return sessionVal.trim();
      }
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
      localStorage.setItem(STORAGE_KEY_GEMINI_API_KEY, trimmed);
      sessionStorage.setItem(STORAGE_KEY_GEMINI_API_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY_GEMINI_API_KEY);
      sessionStorage.removeItem(STORAGE_KEY_GEMINI_API_KEY);
    }
  } catch {
    // storage unavailable
  }
}

export function isCentralGeminiConfigured(): boolean {
  const key = getActiveGeminiApiKey();
  return Boolean(key && key.trim().length > 5);
}
