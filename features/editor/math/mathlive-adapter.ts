import type { MathExpression } from "../../../domain/expressions/ast";
import { parseMathStatement } from "../../../domain/expressions/parser";
import type {
  MathEditorAdapter,
  MathEditorCallbacks,
  MathEditorHandle,
} from "./editor-port";

const greekShortcuts = {
  alpha: "\\alpha",
  beta: "\\beta",
  delta: "\\delta",
  gamma: "\\gamma",
  lambda: "\\lambda",
  mu: "\\mu",
  omega: "\\omega",
  rho: "\\rho",
  sigma: "\\sigma",
  theta: "\\theta",
  tau: "\\tau",
  phi: "\\phi",
};

const greekNames: Record<string, string> = {
  alpha: "\\alpha",
  beta: "\\beta",
  delta: "\\delta",
  gamma: "\\gamma",
  lambda: "\\lambda",
  mu: "\\mu",
  omega: "\\omega",
  rho: "\\rho",
  sigma: "\\sigma",
  theta: "\\theta",
  tau: "\\tau",
  phi: "\\phi",
};

export class MathLiveAdapter implements MathEditorAdapter {
  expressionFromEditorValue(value: string): MathExpression {
    if (!value.trim()) return { kind: "empty" };
    const statement = parseMathStatement(value);
    if (statement.kind !== "expression")
      throw new SyntaxError(
        "Enter the expression separately from its variable definition",
      );
    return statement.expression;
  }

  expressionToEditorValue(expression: MathExpression): string {
    return toLatex(expression);
  }

  async mount(
    host: HTMLElement,
    expression: MathExpression,
    callbacks: MathEditorCallbacks,
  ): Promise<() => void> {
    const { MathfieldElement } = await import("mathlive");
    const field = new MathfieldElement();
    host.replaceChildren(field);
    field.value = this.expressionToEditorValue(expression);
    field.mathVirtualKeyboardPolicy = "manual";
    field.inlineShortcuts = { ...field.inlineShortcuts, ...greekShortcuts };

    const input = () => {
      try {
        callbacks.onExpression(
          this.expressionFromEditorValue(field.getValue("ascii-math")),
        );
      } catch (error) {
        callbacks.onInvalid(
          error instanceof Error
            ? error.message
            : "Unsupported mathematical structure",
        );
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === '"' && !field.getValue("ascii-math").trim()) {
        event.preventDefault();
        callbacks.onRequestText();
      }
    };
    const focus = () => callbacks.onFocus();
    field.addEventListener("input", input);
    field.addEventListener("keydown", keydown);
    field.addEventListener("focus", focus);

    const handle: MathEditorHandle = {
      focus: () => field.focus(),
      insert: (latex) =>
        field.insert(latex, {
          format: "latex",
          selectionMode: "placeholder",
          focus: true,
        }),
      getMenuItems: () => field.menuItems,
      selectMenuItem(item) {
        field.focus();
        const menuItem = item as unknown as {
          id?: string;
          data?: unknown;
          onMenuSelect?: (event: {
            target: EventTarget | undefined;
            modifiers: {
              alt: boolean;
              control: boolean;
              shift: boolean;
              meta: boolean;
            };
            id?: string;
            data?: unknown;
          }) => void;
        };
        menuItem.onMenuSelect?.({
          target: field,
          modifiers: { alt: false, control: false, shift: false, meta: false },
          id: menuItem.id,
          data: menuItem.data,
        });
      },
    };
    callbacks.onReady(handle);

    return () => {
      field.removeEventListener("input", input);
      field.removeEventListener("keydown", keydown);
      field.removeEventListener("focus", focus);
      callbacks.onReady(null);
      field.remove();
    };
  }
}

function toLatex(expression: MathExpression): string {
  switch (expression.kind) {
    case "empty":
      return "";
    case "number":
      return String(expression.value);
    case "identifier":
      return (
        greekNames[expression.name] ??
        `\\mathrm{${escapeLatexText(expression.name)}}`
      );
    case "constant":
      return expression.name === "pi" ? "\\pi" : "e";
    case "quantity":
      return `${toLatex(expression.magnitude)}\\,\\mathrm{${escapeLatexText(expression.unit)}}`;
    case "unary":
      return `${expression.operator === "negative" ? "-" : "+"}${toLatex(expression.operand)}`;
    case "binary":
      return `${toLatex(expression.left)} ${binarySymbols[expression.operator]} ${toLatex(expression.right)}`;
    case "fraction":
      return `\\frac{${toLatex(expression.numerator)}}{${toLatex(expression.denominator)}}`;
    case "root":
      return `\\sqrt{${toLatex(expression.radicand)}}`;
    case "power":
      return `${group(expression.base)}^{${toLatex(expression.exponent)}}`;
    case "subscript":
      return `${group(expression.base)}_{${toLatex(expression.subscript)}}`;
    case "function":
      return `\\${expression.name}\\left(${toLatex(expression.argument)}\\right)`;
  }
}

const binarySymbols: Record<
  "add" | "subtract" | "multiply" | "divide" | "power",
  string
> = {
  add: "+",
  subtract: "-",
  multiply: "\\cdot",
  divide: "/",
  power: "^",
};

function group(expression: MathExpression): string {
  if (
    expression.kind === "identifier" ||
    expression.kind === "constant" ||
    expression.kind === "number"
  ) {
    return toLatex(expression);
  }
  return `\\left(${toLatex(expression)}\\right)`;
}

function escapeLatexText(value: string): string {
  return value.replace(/[{}\\]/g, "\\$&");
}
