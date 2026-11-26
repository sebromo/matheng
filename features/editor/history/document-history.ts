import type { WorksheetDocument } from "../../../domain/worksheet/model";
import {
  applyWorksheetCommand,
  type WorksheetCommand,
} from "../commands/worksheet-command";

export type HistorySnapshot = {
  document: WorksheetDocument;
  canUndo: boolean;
  canRedo: boolean;
};

export class DocumentHistory {
  private document: WorksheetDocument;
  private past: WorksheetDocument[] = [];
  private future: WorksheetDocument[] = [];
  private readonly listeners = new Set<() => void>();
  private snapshot: HistorySnapshot;
  private lastCoalesce: { key: string; at: number } | null = null;

  constructor(
    initialDocument: WorksheetDocument,
    private readonly limit = 100,
  ) {
    this.document = initialDocument;
    this.snapshot = {
      document: initialDocument,
      canUndo: false,
      canRedo: false,
    };
  }

  getSnapshot = (): HistorySnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  execute(command: WorksheetCommand, coalesceKey?: string): void {
    const next = applyWorksheetCommand(this.document, command);
    if (next === this.document) return;
    const now = Date.now();
    const coalesce =
      coalesceKey &&
      this.lastCoalesce?.key === coalesceKey &&
      now - this.lastCoalesce.at < 750;
    if (!coalesce) this.past = [...this.past, this.document].slice(-this.limit);
    this.document = next;
    this.future = [];
    this.lastCoalesce = coalesceKey ? { key: coalesceKey, at: now } : null;
    this.emit();
  }

  replace(document: WorksheetDocument): void {
    this.document = document;
    this.past = [];
    this.future = [];
    this.lastCoalesce = null;
    this.emit();
  }

  undo(): void {
    const previous = this.past.at(-1);
    if (!previous) return;
    this.past = this.past.slice(0, -1);
    this.future = [this.document, ...this.future].slice(0, this.limit);
    this.document = previous;
    this.lastCoalesce = null;
    this.emit();
  }

  redo(): void {
    const next = this.future[0];
    if (!next) return;
    this.future = this.future.slice(1);
    this.past = [...this.past, this.document].slice(-this.limit);
    this.document = next;
    this.lastCoalesce = null;
    this.emit();
  }

  private emit(): void {
    this.snapshot = {
      document: this.document,
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
    };
    for (const listener of this.listeners) listener();
  }
}
