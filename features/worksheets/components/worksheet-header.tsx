"use client";

import {
  Download,
  FilePlus2,
  LogOut,
  Redo2,
  RotateCcw,
  Undo2,
} from "lucide-react";
import type { WorksheetDocument } from "../../../domain/worksheet/model";
import type { WorksheetApiRecord } from "../../../shared/contracts/worksheet-api";

type Props = {
  document: WorksheetDocument;
  worksheets: WorksheetApiRecord[];
  cloudState: string;
  saveState: string;
  lastSaved: string;
  canUndo: boolean;
  canRedo: boolean;
  disabled: boolean;
  onOpenWorksheet(id: string): void;
  onTitleChange(title: string): void;
  onNewWorksheet(): void;
  onUndo(): void;
  onRedo(): void;
  onReset(): void;
  onExport(): void;
  onSignOut(): void;
};

export function WorksheetHeader({
  document,
  worksheets,
  cloudState,
  saveState,
  lastSaved,
  canUndo,
  canRedo,
  disabled,
  onOpenWorksheet,
  onTitleChange,
  onNewWorksheet,
  onUndo,
  onRedo,
  onReset,
  onExport,
  onSignOut,
}: Props) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          f
        </div>
        <span className="brand-name">forma</span>
        <span className="brand-divider" />
        <select
          className="worksheet-picker"
          aria-label="Open worksheet"
          value={document.id}
          disabled={disabled}
          onChange={(event) => onOpenWorksheet(event.target.value)}
        >
          {worksheets.map((record) => (
            <option key={record.document.id} value={record.document.id}>
              {record.document.title}
            </option>
          ))}
        </select>
        <input
          className="document-name"
          aria-label="Worksheet name"
          maxLength={160}
          value={document.title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </div>
      <div className="save-indicator">
        <span
          className={`save-dot ${cloudState === "Saved to server" || cloudState === "Synced with server" ? "" : "pending"}`}
        />
        {cloudState}
        <span className="saved-time">
          {saveState}
          {lastSaved && ` · ${lastSaved}`}
        </span>
      </div>
      <div className="topbar-actions">
        <button
          className="topbar-button"
          type="button"
          title="New worksheet"
          aria-label="New worksheet"
          disabled={disabled}
          onClick={onNewWorksheet}
        >
          <FilePlus2 size={15} />
          <span>New</span>
        </button>
        <button
          className="topbar-button"
          type="button"
          title="Undo"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 size={15} />
          <span>Undo</span>
        </button>
        <button
          className="topbar-button"
          type="button"
          title="Redo"
          aria-label="Redo"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2 size={15} />
          <span>Redo</span>
        </button>
        <button
          className="topbar-button"
          type="button"
          title="Reset worksheet"
          onClick={onReset}
        >
          <RotateCcw size={15} />
          <span>Reset</span>
        </button>
        <button
          className="topbar-button"
          type="button"
          title="Export worksheet JSON"
          onClick={onExport}
        >
          <Download size={15} />
          <span>Export</span>
        </button>
        <button
          className="topbar-button"
          type="button"
          title="Sign out"
          aria-label="Sign out"
          onClick={onSignOut}
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
