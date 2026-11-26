import { CalculationSession } from "../../../domain/calculation/engine";
import type { CalculationResult } from "../../../domain/calculation/types";
import type { WorksheetDocument } from "../../../domain/worksheet/model";

export type CalculationStateSnapshot = {
  documentId: string;
  result: CalculationResult;
};

export class CalculationStateStore {
  private readonly session = new CalculationSession();
  private snapshot: CalculationStateSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(initialDocument: WorksheetDocument) {
    this.snapshot = {
      documentId: initialDocument.id,
      result: this.session.calculate(initialDocument),
    };
  }

  getSnapshot = (): CalculationStateSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  update(document: WorksheetDocument): void {
    this.snapshot = {
      documentId: document.id,
      result: this.session.calculate(document),
    };
    for (const listener of this.listeners) listener();
  }
}
