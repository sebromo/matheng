"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { parseMathStatement } from "../../../domain/expressions/parser";
import type { MathStatement } from "../../../domain/expressions/ast";
import type { Point, WorksheetRegion } from "../../../domain/worksheet/model";
import { DocumentHistory } from "../../editor/history/document-history";
import type { MathEditorHandle } from "../../editor/math/editor-port";
import { EditorStateStore } from "../../editor/state/editor-state";
import { authClient } from "../../auth/auth-client";
import { starterDocument } from "../model/starter-document";
import { CalculationStateStore } from "../state/calculation-state";
import { useWorksheetSession } from "../hooks/use-worksheet-session";
import { WorksheetCanvas } from "./worksheet-canvas";
import { WorksheetConflictBanner } from "./worksheet-conflict-banner";
import { WorksheetHeader } from "./worksheet-header";
import { WorksheetToolbox } from "./worksheet-toolbox";

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

type DragState = { regionId: string; pointerId: number; position: Point };

export function WorksheetWorkspace({ userId }: { userId: string }) {
  const [history] = useState(() => new DocumentHistory(starterDocument));
  const [editorStore] = useState(() => new EditorStateStore());
  const [calculationStore] = useState(
    () => new CalculationStateStore(starterDocument),
  );
  const historyState = useSyncExternalStore(
    history.subscribe,
    history.getSnapshot,
    history.getSnapshot,
  );
  const editorState = useSyncExternalStore(
    editorStore.subscribe,
    editorStore.getSnapshot,
    editorStore.getSnapshot,
  );
  const calculationState = useSyncExternalStore(
    calculationStore.subscribe,
    calculationStore.getSnapshot,
    calculationStore.getSnapshot,
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const [signOutError, setSignOutError] = useState("");
  const [, setEditorHandlesVersion] = useState(0);
  const canvasRef = useRef<HTMLElement>(null);
  const editorHandles = useRef(new Map<string, MathEditorHandle>());
  const pendingInsertion = useRef<{ regionId: string; latex: string } | null>(
    null,
  );
  const dragPosition = useRef<DragState | null>(null);
  const document = historyState.document;
  const calculation = calculationState.result;
  const menuEditor =
    editorHandles.current.get(editorState.activeRegionId ?? "") ??
    editorHandles.current.values().next().value;
  const session = useWorksheetSession({
    userId,
    document,
    history,
    calculationStore,
    editorStore,
  });
  const {
    ready,
    saveState,
    cloudState,
    worksheets,
    syncConflict,
    lastSaved,
    openWorksheet,
    createWorksheet,
    reloadServerVersion,
    saveRecoveredCopy,
  } = session;

  useEffect(
    () =>
      history.subscribe(() =>
        calculationStore.update(history.getSnapshot().document),
      ),
    [calculationStore, history],
  );

  useEffect(() => {
    function handleHistory(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z")
        return;
      if (
        (event.target as HTMLElement | null)?.tagName.toLowerCase() ===
        "math-field"
      )
        return;
      event.preventDefault();
      if (event.shiftKey) history.redo();
      else history.undo();
    }
    window.addEventListener("keydown", handleHistory);
    return () => window.removeEventListener("keydown", handleHistory);
  }, [history]);

  function executeReplace(region: WorksheetRegion) {
    history.execute({ type: "replace-region", region }, `region:${region.id}`);
  }

  function addRegion(
    type: "math" | "text",
    position: Point,
    initialLatex = "",
  ) {
    discardEmptyMathRegions();
    const currentDocument = history.getSnapshot().document;
    const regionId = `region-${crypto.randomUUID()}`;
    const region: WorksheetRegion =
      type === "math"
        ? {
            id: regionId,
            type,
            content: { kind: "expression", expression: { kind: "empty" } },
            position,
            zIndex: currentDocument.regions.length,
          }
        : {
            id: regionId,
            type,
            content: "",
            position,
            zIndex: currentDocument.regions.length,
          };
    history.execute({ type: "insert-region", region });
    editorStore.update((state) => ({ ...state, activeRegionId: regionId }));
    if (initialLatex)
      pendingInsertion.current = { regionId, latex: initialLatex };
  }

  function addAtEnd(type: "math" | "text") {
    const currentDocument = history.getSnapshot().document;
    const lastY = currentDocument.regions.reduce(
      (max, region) => Math.max(max, region.position.y),
      14,
    );
    addRegion(type, {
      x: 14.7,
      y: lastY + 18 < PAGE_HEIGHT_MM - 10 ? lastY + 18 : 20,
    });
  }

  function discardEmptyMathRegions() {
    const emptyRegionIds = history
      .getSnapshot()
      .document.regions.filter(isEmptyMathRegion)
      .map((region) => region.id);
    for (const regionId of emptyRegionIds)
      history.execute({ type: "delete-region", regionId });
  }

  function handleRegionFocusLeave(regionId: string) {
    window.setTimeout(() => {
      const region = history
        .getSnapshot()
        .document.regions.find((item) => item.id === regionId);
      if (!region || !isEmptyMathRegion(region)) return;
      history.execute({ type: "delete-region", regionId });
      editorStore.update((state) =>
        state.activeRegionId === regionId
          ? { ...state, activeRegionId: null }
          : state,
      );
    }, 0);
  }

  function handlePaperClick(event: MouseEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    addRegion("math", {
      x: clamp(
        ((event.clientX - bounds.left) / bounds.width) * PAGE_WIDTH_MM,
        4,
        PAGE_WIDTH_MM - 8,
      ),
      y: clamp(
        ((event.clientY - bounds.top) / bounds.height) * PAGE_HEIGHT_MM,
        4,
        PAGE_HEIGHT_MM - 8,
      ),
    });
  }

  function handleMathEditorReady(
    regionId: string,
    handle: MathEditorHandle | null,
  ) {
    if (handle) {
      editorHandles.current.set(regionId, handle);
      if (editorStore.getSnapshot().activeRegionId === regionId) handle.focus();
      if (pendingInsertion.current?.regionId === regionId) {
        handle.insert(pendingInsertion.current.latex);
        pendingInsertion.current = null;
      }
    } else {
      editorHandles.current.delete(regionId);
    }
    setEditorHandlesVersion((version) => version + 1);
  }

  function requestText(region: WorksheetRegion) {
    if (region.type !== "math" || region.content.expression.kind !== "empty")
      return;
    history.execute({
      type: "replace-region",
      region: { ...region, type: "text", content: "" },
    });
  }

  function requestMath(region: WorksheetRegion) {
    if (region.type !== "text") return;
    let content: MathStatement;
    try {
      content = parseMathStatement(region.content);
    } catch {
      content = { kind: "expression", expression: { kind: "empty" } };
    }
    history.execute({
      type: "replace-region",
      region: { ...region, type: "math", content },
    });
  }

  function startDrag(
    event: PointerEvent<HTMLButtonElement>,
    region: WorksheetRegion,
  ) {
    if (!canvasRef.current) return;
    event.preventDefault();
    const pointerId = event.pointerId;
    const bounds = canvasRef.current.getBoundingClientRect();
    const move = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const next = {
        regionId: region.id,
        pointerId,
        position: {
          x: clamp(
            ((moveEvent.clientX - bounds.left) / bounds.width) * PAGE_WIDTH_MM,
            0,
            PAGE_WIDTH_MM - 4,
          ),
          y: clamp(
            ((moveEvent.clientY - bounds.top) / bounds.height) * PAGE_HEIGHT_MM,
            0,
            PAGE_HEIGHT_MM - 4,
          ),
        },
      };
      dragPosition.current = next;
      setDrag(next);
    };
    const finish = (upEvent: globalThis.PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      const current = dragPosition.current;
      if (current?.regionId === region.id)
        history.execute({
          type: "move-region",
          regionId: region.id,
          position: current.position,
        });
      dragPosition.current = null;
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
  }

  function exportWorksheet() {
    const file = new Blob([JSON.stringify(document, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(file);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${
      document.title
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "") || "worksheet"
    }.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function resetWorksheet() {
    if (!window.confirm("Reset this worksheet to the starter calculation?"))
      return;
    history.replace({ ...starterDocument, id: document.id });
    editorStore.update((state) => ({ ...state, activeRegionId: "moment" }));
  }

  return (
    <main className="app-shell">
      <WorksheetHeader
        document={document}
        worksheets={worksheets}
        cloudState={cloudState}
        saveState={saveState}
        lastSaved={lastSaved}
        canUndo={historyState.canUndo}
        canRedo={historyState.canRedo}
        disabled={!ready || Boolean(syncConflict)}
        onOpenWorksheet={(id) => void openWorksheet(id)}
        onTitleChange={(title) =>
          history.execute(
            { type: "rename-worksheet", title },
            "worksheet:title",
          )
        }
        onNewWorksheet={() => void createWorksheet()}
        onUndo={() => history.undo()}
        onRedo={() => history.redo()}
        onReset={resetWorksheet}
        onExport={exportWorksheet}
        onSignOut={async () => {
          setSignOutError("");
          try {
            const result = await authClient.signOut();
            if (result.error) {
              setSignOutError("Unable to sign out. Please try again.");
              return;
            }
            window.location.assign("/sign-in");
          } catch {
            setSignOutError("Unable to sign out. Please try again.");
          }
        }}
      />

      {signOutError && (
        <p className="auth-error" role="alert">
          {signOutError}
        </p>
      )}

      {syncConflict && (
        <WorksheetConflictBanner
          conflict={syncConflict}
          onReload={reloadServerVersion}
          onSaveCopy={() => void saveRecoveredCopy()}
        />
      )}

      <div className="workspace">
        <WorksheetCanvas
          document={document}
          calculation={calculation}
          activeRegionId={editorState.activeRegionId}
          canvasRef={canvasRef}
          dragRegionId={drag?.regionId}
          dragPosition={drag?.position}
          onPaperClick={handlePaperClick}
          onActivate={(regionId) =>
            editorStore.update((state) => ({
              ...state,
              activeRegionId: regionId,
            }))
          }
          onRegionFocusLeave={handleRegionFocusLeave}
          onDelete={(regionId) =>
            history.execute({ type: "delete-region", regionId })
          }
          onReplace={executeReplace}
          onDragStart={(event, region) => startDrag(event, region)}
          onMathEditorReady={handleMathEditorReady}
          onRequestText={requestText}
          onRequestMath={requestMath}
        />
        <WorksheetToolbox
          onAddRegion={addAtEnd}
          menuItems={menuEditor?.getMenuItems() ?? []}
          onSelectMenuItem={(item) => menuEditor?.selectMenuItem(item)}
          onOpenMathMenu={() => menuEditor?.focus()}
        />
      </div>
    </main>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isEmptyMathRegion(region: WorksheetRegion): boolean {
  return region.type === "math" && region.content.expression.kind === "empty";
}
