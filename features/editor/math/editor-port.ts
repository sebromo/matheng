import type { MathExpression } from "../../../domain/expressions/ast";
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
  onInvalid(message: string): void;
  onFocus(): void;
  onRequestText(): void;
  onReady(handle: MathEditorHandle | null): void;
};

export interface MathEditorAdapter {
  expressionFromEditorValue(value: string): MathExpression;
  expressionToEditorValue(expression: MathExpression): string;
  mount(
    host: HTMLElement,
    expression: MathExpression,
    callbacks: MathEditorCallbacks,
  ): Promise<() => void>;
}
