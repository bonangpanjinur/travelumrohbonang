import { useEffect, useRef, useState, useCallback } from "react";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEBOUNCE_MS = 1_500;

interface DraftEnvelope<T> {
  value: T;
  savedAt: number; // Unix ms
}

export interface UseFormDraftOptions<T extends Record<string, unknown>> {
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

export interface FormDraftState {
  /** True when a non-expired draft exists and the user hasn't acted on it yet. */
  hasDraft: boolean;
  /** Restore the draft into the form (calls onRestore + hides banner). */
  restoreDraft: () => void;
  /** Discard the draft (clears localStorage + hides banner). */
  clearDraft: () => void;
  /**
   * True when the current form value differs from the last "clean" snapshot.
   * The snapshot is taken on first mount, on key change, and whenever
   * markClean() is called explicitly.
   */
  isDirty: boolean;
  /**
   * Capture the current form value as the new "clean" baseline.
   * Call this after loading server data into the form (e.g. after an async
   * fetchExtraHotels) so the dirty indicator starts from the right baseline.
   */
  markClean: () => void;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

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

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFormDraft<T extends Record<string, unknown>>({
  key,
  value,
  onRestore,
  isEmpty = defaultIsEmpty,
}: UseFormDraftOptions<T>): FormDraftState {
  const [hasDraft, setHasDraft] = useState<boolean>(() => !!loadDraft<T>(key));

  // Stable refs — avoid stale closures without adding to dep arrays
  const valueRef = useRef(value);
  valueRef.current = value;

  const hasDraftRef = useRef(hasDraft);
  hasDraftRef.current = hasDraft;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dirty tracking ────────────────────────────────────────────────────────
  // Serialize to JSON for a simple deep-equal check on plain objects/arrays.
  const cleanSnapshotRef = useRef<string>(JSON.stringify(value));
  const isDirty = JSON.stringify(value) !== cleanSnapshotRef.current;

  const markClean = useCallback(() => {
    cleanSnapshotRef.current = JSON.stringify(valueRef.current);
  }, []);

  // ── Re-check draft + reset dirty baseline when the key changes ────────────
  // (e.g. when switching between new-form and edit-{id} in Packages)
  useEffect(() => {
    setHasDraft(!!loadDraft<T>(key));
    // Reset dirty baseline to whatever value is current at this moment.
    // For new forms this is EMPTY_FORM; for edit forms the caller should
    // call markClean() again once async data (extraHotels, etc.) is loaded.
    cleanSnapshotRef.current = JSON.stringify(valueRef.current);
  }, [key]);

  // ── Auto-save on every form change ────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      // While the restore banner is visible, do NOT overwrite the existing
      // draft with the freshly-loaded (DB) form values.
      if (hasDraftRef.current) return;
      if (isEmpty(valueRef.current)) return;
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
      // The restored values become the new clean baseline so the indicator
      // doesn't light up just because we restored.
      cleanSnapshotRef.current = JSON.stringify(saved);
    }
    setHasDraft(false);
  }, [key, onRestore]);

  const clearDraft = useCallback(() => {
    removeDraft(key);
    setHasDraft(false);
    // Also mark clean so the dot disappears on a successful submit/reset.
    cleanSnapshotRef.current = JSON.stringify(valueRef.current);
  }, [key]);

  return { hasDraft, restoreDraft, clearDraft, isDirty, markClean };
}
