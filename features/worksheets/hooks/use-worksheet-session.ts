"use client";

import { useEffect, useRef, useState } from "react";
import { serializeWorksheet } from "../../../domain/worksheet/serialization";
import type { WorksheetDocument } from "../../../domain/worksheet/model";
import type { WorksheetApiRecord } from "../../../shared/contracts/worksheet-api";
import { DocumentHistory } from "../../editor/history/document-history";
import { EditorStateStore } from "../../editor/state/editor-state";
import { CalculationStateStore } from "../state/calculation-state";
import { starterDocument } from "../model/starter-document";
import { loadLocalRecovery, saveLocalRecovery } from "../state/recovery";

type PendingSave = { requestId: string; revision: number; document: string };

class ApiResponseError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = {
  userId: string;
  document: WorksheetDocument;
  history: DocumentHistory;
  calculationStore: CalculationStateStore;
  editorStore: EditorStateStore;
};

export function useWorksheetSession({
  userId,
  document,
  history,
  calculationStore,
  editorStore,
}: Options) {
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState("Loading local recovery");
  const [cloudState, setCloudState] = useState("Connecting to Forma");
  const [baseRevision, setBaseRevision] = useState<number | null>(null);
  const [worksheets, setWorksheets] = useState<WorksheetApiRecord[]>([]);
  const [syncConflict, setSyncConflict] = useState<WorksheetApiRecord | null>(
    null,
  );
  const [retryCount, setRetryCount] = useState(0);
  const [lastSaved, setLastSaved] = useState("");
  const initialWorksheetId = useRef(crypto.randomUUID());
  const lastSyncedDocument = useRef<string | null>(null);
  const pendingSave = useRef<PendingSave | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      let draft: ReturnType<typeof loadLocalRecovery> = null;
      let recoveryUnavailable = false;
      try {
        try {
          draft = loadLocalRecovery(window.localStorage, userId);
        } catch {
          recoveryUnavailable = true;
        }
        if (draft)
          installDocument(
            draft.document,
            history,
            calculationStore,
            editorStore,
          );

        const response = await fetch("/api/worksheets", { cache: "no-store" });
        const payload = await readResponse<{ data: WorksheetApiRecord[] }>(
          response,
        );
        const records = payload.data;
        setWorksheets(records);
        let selected: WorksheetApiRecord;

        if (draft) {
          const matching = records.find(
            (record) => record.document.id === draft?.document.id,
          );
          if (matching) {
            selected = matching;
            lastSyncedDocument.current = serializeWorksheet(matching.document);
            if (draft.baseRevision !== matching.revision) {
              setSyncConflict(matching);
              setCloudState("Draft conflicts with a newer server revision");
            } else {
              setCloudState(
                serializeWorksheet(draft.document) ===
                  serializeWorksheet(matching.document)
                  ? "Synced with server"
                  : "Syncing recovered draft",
              );
            }
          } else {
            selected = await createServerWorksheet({
              ...draft.document,
              id: initialWorksheetId.current,
              title: `${draft.document.title} (recovered)`.slice(0, 160),
            });
            installDocument(
              selected.document,
              history,
              calculationStore,
              editorStore,
            );
            lastSyncedDocument.current = serializeWorksheet(selected.document);
            setCloudState("Recovered as a new worksheet");
          }
        } else if (records[0]) {
          selected = records[0];
          installDocument(
            selected.document,
            history,
            calculationStore,
            editorStore,
          );
          lastSyncedDocument.current = serializeWorksheet(selected.document);
          setCloudState("Synced with server");
        } else {
          selected = await createServerWorksheet({
            ...starterDocument,
            id: initialWorksheetId.current,
          });
          installDocument(
            selected.document,
            history,
            calculationStore,
            editorStore,
          );
          lastSyncedDocument.current = serializeWorksheet(selected.document);
          setCloudState("Saved to server");
        }

        if (cancelled) return;
        if (recoveryUnavailable)
          setCloudState("Local recovery unreadable; server data loaded");
        setWorksheets((current) => [
          selected,
          ...current.filter(
            (record) => record.document.id !== selected.document.id,
          ),
        ]);
        setBaseRevision(selected.revision);
        setSaveState(draft ? "Recovered local draft" : "Ready");
      } catch (error) {
        setCloudState(
          error instanceof ApiResponseError && error.status === 401
            ? "Session expired. Changes are saved locally."
            : error instanceof Error
              ? `Offline: ${error.message}`
              : "Offline; local recovery enabled",
        );
        setSaveState(
          draft ? "Recovered local draft" : "Local recovery enabled",
        );
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, [calculationStore, editorStore, history, userId]);

  useEffect(() => {
    if (!ready) return;
    const timeout = window.setTimeout(() => {
      try {
        saveLocalRecovery(window.localStorage, document, baseRevision, userId);
        setLastSaved(
          new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        );
        setSaveState("Saved locally");
      } catch {
        setSaveState("Unable to save recovery");
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [baseRevision, document, ready, userId]);

  useEffect(() => {
    if (!ready || baseRevision === null || syncConflict || saving.current)
      return;
    let serialized: string;
    try {
      serialized = serializeWorksheet(document);
    } catch {
      setCloudState("Worksheet needs valid content before saving");
      return;
    }
    if (serialized === lastSyncedDocument.current) return;

    const timeout = window.setTimeout(async () => {
      saving.current = true;
      const request =
        pendingSave.current?.revision === baseRevision &&
        pendingSave.current.document === serialized
          ? pendingSave.current
          : {
              requestId: crypto.randomUUID(),
              revision: baseRevision,
              document: serialized,
            };
      pendingSave.current = request;
      setCloudState("Saving to server");
      try {
        const response = await saveDocument(document, request);
        if (response.status === 409) {
          const latest = await fetch(
            `/api/worksheets/${encodeURIComponent(document.id)}`,
            { cache: "no-store" },
          );
          const current = await readResponse<{ data: WorksheetApiRecord }>(
            latest,
          );
          setSyncConflict(current.data);
          setCloudState("Draft conflict; server was not overwritten");
          return;
        }
        const saved = await readResponse<{ data: WorksheetApiRecord }>(
          response,
        );
        setBaseRevision(saved.data.revision);
        lastSyncedDocument.current = serialized;
        pendingSave.current = null;
        setWorksheets((current) => [
          saved.data,
          ...current.filter(
            (record) => record.document.id !== saved.data.document.id,
          ),
        ]);
        setCloudState("Saved to server");
      } catch (error) {
        if (error instanceof ApiResponseError && error.status < 500) {
          setCloudState(
            error.status === 401
              ? "Session expired. Changes are saved locally."
              : `Save rejected (${error.status}): ${error.message}`,
          );
          return;
        }
        setCloudState(
          error instanceof Error
            ? `Retrying: ${error.message}`
            : "Retrying server save",
        );
        window.setTimeout(() => setRetryCount((count) => count + 1), 3000);
      } finally {
        saving.current = false;
      }
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [baseRevision, document, ready, retryCount, syncConflict]);

  async function flushCurrentDocument(): Promise<boolean> {
    if (syncConflict || baseRevision === null || saving.current) return false;
    const serialized = serializeWorksheet(document);
    if (serialized === lastSyncedDocument.current) return true;

    saving.current = true;
    const request = {
      requestId: crypto.randomUUID(),
      revision: baseRevision,
      document: serialized,
    };
    pendingSave.current = request;
    setCloudState("Saving to server");
    try {
      const response = await saveDocument(document, request);
      if (response.status === 409) {
        const latest = await fetch(
          `/api/worksheets/${encodeURIComponent(document.id)}`,
          { cache: "no-store" },
        );
        const current = await readResponse<{ data: WorksheetApiRecord }>(
          latest,
        );
        setSyncConflict(current.data);
        setCloudState("Draft conflict; server was not overwritten");
        return false;
      }
      const saved = await readResponse<{ data: WorksheetApiRecord }>(response);
      setBaseRevision(saved.data.revision);
      lastSyncedDocument.current = serialized;
      pendingSave.current = null;
      setWorksheets((current) => [
        saved.data,
        ...current.filter(
          (record) => record.document.id !== saved.data.document.id,
        ),
      ]);
      setCloudState("Saved to server");
      return true;
    } catch (error) {
      setCloudState(
        error instanceof Error ? error.message : "Unable to save worksheet",
      );
      return false;
    } finally {
      saving.current = false;
    }
  }

  async function openWorksheet(worksheetId: string) {
    const selected = worksheets.find(
      (record) => record.document.id === worksheetId,
    );
    if (
      !selected ||
      selected.document.id === document.id ||
      !(await flushCurrentDocument())
    )
      return;
    installDocument(selected.document, history, calculationStore, editorStore);
    lastSyncedDocument.current = serializeWorksheet(selected.document);
    pendingSave.current = null;
    setBaseRevision(selected.revision);
    setSyncConflict(null);
    setCloudState("Opened worksheet");
  }

  async function createWorksheet() {
    if (!(await flushCurrentDocument())) return;
    try {
      const created = await createServerWorksheet({
        ...starterDocument,
        id: crypto.randomUUID(),
        title: "Untitled worksheet",
      });
      setWorksheets((current) => [
        created,
        ...current.filter(
          (record) => record.document.id !== created.document.id,
        ),
      ]);
      installDocument(created.document, history, calculationStore, editorStore);
      lastSyncedDocument.current = serializeWorksheet(created.document);
      pendingSave.current = null;
      setBaseRevision(created.revision);
      setSyncConflict(null);
      setCloudState("Saved to server");
    } catch (error) {
      setCloudState(
        error instanceof Error
          ? `Unable to create worksheet: ${error.message}`
          : "Unable to create worksheet",
      );
    }
  }

  async function reloadServerVersion() {
    if (!syncConflict) return;
    installDocument(
      syncConflict.document,
      history,
      calculationStore,
      editorStore,
    );
    lastSyncedDocument.current = serializeWorksheet(syncConflict.document);
    setBaseRevision(syncConflict.revision);
    pendingSave.current = null;
    setSyncConflict(null);
    setCloudState("Loaded the server version");
  }

  async function saveRecoveredCopy() {
    const recovered = {
      ...document,
      id: crypto.randomUUID(),
      title: `${document.title} (recovered copy)`.slice(0, 160),
    };
    try {
      const created = await createServerWorksheet(recovered);
      setWorksheets((current) => [
        created,
        ...current.filter(
          (record) => record.document.id !== created.document.id,
        ),
      ]);
      installDocument(created.document, history, calculationStore, editorStore);
      lastSyncedDocument.current = serializeWorksheet(created.document);
      setBaseRevision(created.revision);
      pendingSave.current = null;
      setSyncConflict(null);
      setCloudState("Recovered as a new worksheet");
    } catch (error) {
      setCloudState(
        error instanceof Error
          ? error.message
          : "Unable to save recovered copy",
      );
    }
  }

  return {
    ready,
    saveState,
    cloudState,
    baseRevision,
    worksheets,
    syncConflict,
    lastSaved,
    openWorksheet,
    createWorksheet,
    reloadServerVersion,
    saveRecoveredCopy,
  };
}

function installDocument(
  next: WorksheetDocument,
  history: DocumentHistory,
  calculationStore: CalculationStateStore,
  editorStore: EditorStateStore,
): void {
  const cleaned = {
    ...next,
    regions: next.regions.filter(
      (region) =>
        region.type !== "math" || region.content.expression.kind !== "empty",
    ),
  };
  history.replace(cleaned);
  calculationStore.update(cleaned);
  editorStore.update((state) => ({ ...state, activeRegionId: null }));
}

async function saveDocument(
  document: WorksheetDocument,
  request: PendingSave,
): Promise<Response> {
  return fetch(`/api/worksheets/${encodeURIComponent(document.id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": request.requestId,
    },
    body: JSON.stringify({
      document,
      baseRevision: request.revision,
      requestId: request.requestId,
    }),
  });
}

async function createServerWorksheet(
  document: WorksheetDocument,
): Promise<WorksheetApiRecord> {
  const response = await fetch("/api/worksheets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": crypto.randomUUID(),
    },
    body: JSON.stringify({ document }),
  });
  return (await readResponse<{ data: WorksheetApiRecord }>(response)).data;
}

async function readResponse<T>(response: Response): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiResponseError(
      response.status,
      "The server returned invalid JSON",
    );
  }
  if (!response.ok) {
    const failure =
      isRecord(payload) && isRecord(payload.error) ? payload.error : undefined;
    const message =
      typeof failure?.message === "string"
        ? failure.message
        : "The server request failed";
    throw new ApiResponseError(response.status, message);
  }
  if (!isRecord(payload) || !("data" in payload))
    throw new ApiResponseError(
      response.status,
      "The server response was invalid",
    );
  return payload as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
