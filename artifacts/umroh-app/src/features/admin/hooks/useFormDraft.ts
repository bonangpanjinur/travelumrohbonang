import { useEffect, useRef, useState, useCallback } from "react";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEBOUNCE_MS = 1_500;

interface DraftEnvelope<T> {
  value: T;
  savedAt: number; // Unix ms
}

interface UseFormDraftOptions<T extends Record<string, unknown>> {
  /** Unique key — e.g. "admin-create-booking". Namespaced automatically. */
  key: string;
  /** The live form state to watch and auto-save. */
  value: T;
  /** Called with the saved value when the admin clicks "Pulihkan". */
  onRestore: (saved: T) => void;
  /**
   * Return true when the form is considered "empty" (nothing worth saving).
   * Defaults to: every string/null value is empty.
   */
  isEmpty?: (v: T) => boolean;
}

function storageKey(key: string) {
  return `form_draft:${key}`;
}

function defaultIsEmpty<T extends Record<string, unknown>>(v: T): boolean {
  return Object.values(v).every(
    (x) => x === "" || x === null || x === undefined
  );
}

function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed: DraftEnvelope<T> = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(storageKey(key));
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function saveDraft<T>(key: string, value: T) {
  try {
    const envelope: DraftEnvelope<T> = { value, savedAt: Date.now() };
    localStorage.setItem(storageKey(key), JSON.stringify(envelope));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

function removeDraft(key: string) {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {}
}

export interface FormDraftState {
  /** True when a non-expired draft exists and the user hasn't acted on it yet. */
  hasDraft: boolean;
  /** Restore the draft into the form (calls onRestore + hides banner). */
  restoreDraft: () => void;
  /** Discard the draft (clears localStorage + hides banner). */
  clearDraft: () => void;
}

export function useFormDraft<T extends Record<string, unknown>>({
  key,
  value,
  onRestore,
  isEmpty = defaultIsEmpty,
}: UseFormDraftOptions<T>): FormDraftState {
  const [hasDraft, setHasDraft] = useState<boolean>(() => !!loadDraft<T>(key));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a stable ref to the latest value so the debounce closure captures it
  const valueRef = useRef(value);
  valueRef.current = value;

  // ── Auto-save on every form change ────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (isEmpty(valueRef.current)) {
        // Don't bother saving a blank form
        return;
      }
      saveDraft(key, valueRef.current);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, key]);

  const restoreDraft = useCallback(() => {
    const saved = loadDraft<T>(key);
    if (saved) {
      onRestore(saved);
    }
    setHasDraft(false);
  }, [key, onRestore]);

  const clearDraft = useCallback(() => {
    removeDraft(key);
    setHasDraft(false);
  }, [key]);

  return { hasDraft, restoreDraft, clearDraft };
}
