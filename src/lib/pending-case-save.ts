import type { SaveCaseInput } from "@/lib/saved-cases";
import { validateSaveCase } from "@/lib/saved-cases";

const STORAGE_KEY = "fine-print-fighter:pending-case-save:v1";
const PENDING_SAVE_MAX_AGE_MS = 60 * 60 * 1000;

type PendingCaseSaveRecord = { createdAt: number; input: SaveCaseInput };

/** Call only after the user has checked the save consent box and chosen Save case. */
export function storePendingCaseSave(input: SaveCaseInput): void {
  if (!validateSaveCase(input)) throw new Error("Pending case details are invalid.");
  const record: PendingCaseSaveRecord = { createdAt: Date.now(), input };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function readPendingCaseSave(): SaveCaseInput | null {
  const serialized = window.sessionStorage.getItem(STORAGE_KEY);
  if (!serialized) return null;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const record = parsed as Partial<PendingCaseSaveRecord>;
    const age = Date.now() - Number(record.createdAt);
    if (!Number.isFinite(record.createdAt) || age < 0 || age > PENDING_SAVE_MAX_AGE_MS || !validateSaveCase(record.input)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return record.input;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearPendingCaseSave(): void {
  window.sessionStorage.removeItem(STORAGE_KEY);
}
