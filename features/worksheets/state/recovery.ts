import {
  deserializeWorksheet,
  serializeWorksheet,
} from "../../../domain/worksheet/serialization";
import type { WorksheetDocument } from "../../../domain/worksheet/model";

const currentStorageKey = "forma-worksheet-recovery-v1";
const previousStorageKey = "forma-worksheet-v2";
const legacyStorageKey = "forma-worksheet-v1";

function scopedKey(scope: string | undefined): string {
  return scope ? `${currentStorageKey}:${scope}` : currentStorageKey;
}

export type LocalWorksheetDraft = {
  document: WorksheetDocument;
  baseRevision: number | null;
};

export function loadLocalRecovery(
  storage: Storage,
  scope?: string,
): LocalWorksheetDraft | null {
  const current = storage.getItem(scopedKey(scope));
  if (current) {
    const parsed: unknown = JSON.parse(current);
    if (isRecoveryEnvelope(parsed)) {
      return {
        document: deserializeWorksheet(JSON.stringify(parsed.document)),
        baseRevision: parsed.baseRevision,
      };
    }
    return { document: deserializeWorksheet(current), baseRevision: null };
  }
  if (scope) return null;

  const previous = storage.getItem(previousStorageKey);
  if (previous)
    return { document: deserializeWorksheet(previous), baseRevision: null };
  const legacy = storage.getItem(legacyStorageKey);
  if (legacy)
    return { document: deserializeWorksheet(legacy), baseRevision: null };
  return null;
}

export function saveLocalRecovery(
  storage: Storage,
  document: WorksheetDocument,
  baseRevision: number | null,
  scope?: string,
): void {
  storage.setItem(
    scopedKey(scope),
    JSON.stringify({
      recoveryVersion: 1,
      baseRevision,
      document: JSON.parse(serializeWorksheet(document)) as WorksheetDocument,
      savedAt: new Date().toISOString(),
    }),
  );
}

export function clearLocalRecovery(storage: Storage, scope?: string): void {
  storage.removeItem(scopedKey(scope));
  storage.removeItem(legacyStorageKey);
  storage.removeItem(previousStorageKey);
}

function isRecoveryEnvelope(value: unknown): value is {
  recoveryVersion: 1;
  baseRevision: number | null;
  document: unknown;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "recoveryVersion" in value &&
    value.recoveryVersion === 1 &&
    "document" in value &&
    "baseRevision" in value &&
    (value.baseRevision === null ||
      (typeof value.baseRevision === "number" &&
        Number.isSafeInteger(value.baseRevision) &&
        value.baseRevision >= 1))
  );
}
