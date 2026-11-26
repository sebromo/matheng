import type {
  MathExpression,
  MathStatement,
} from "../../../domain/expressions/ast";
import type { MathfieldElement } from "mathlive";

export type MathMenuItem = MathfieldElement["menuItems"][number];

export type MathEditorHandle = {
  focus(): void;
  insert(latex: string): void;
  getMenuItems(): readonly MathMenuItem[];
  selectMenuItem(item: MathMenuItem): void;
};

export type MathEditorCallbacks = {
  onExpression(expression: MathExpression): void;
  onAssignment(name: string, expression: MathExpression): void;
  onPending(): void;
  onInvalid(message: string): void;
  onFocus(): void;
  onRequestText(): void;
  onReady(handle: MathEditorHandle | null): void;
};

export interface MathEditorAdapter {
  expressionFromEditorValue(value: string): MathExpression;
  expressionToEditorValue(expression: MathExpression): string;
  statementFromEditorValue(value: string): MathStatement | null;
  mount(
    host: HTMLElement,
    expression: MathExpression,
    callbacks: MathEditorCallbacks,
    deferBareIdentifier?: boolean,
  ): Promise<() => void>;
}
