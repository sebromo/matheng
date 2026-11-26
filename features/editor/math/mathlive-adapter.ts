import type {
  MathExpression,
  MathStatement,
} from "../../../domain/expressions/ast";
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

  statementFromEditorValue(
    value: string,
    deferBareIdentifier = false,
  ): MathStatement | null {
    const assignment =
      value.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*:\s*=\s*([\s\S]*)$/) ??
      value.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*:\s+([\s\S]*)$/);

    if (assignment) {
      const [, name, source] = assignment;
      const expression = source.trim()
        ? this.expressionFromEditorValue(source)
        : { kind: "empty" as const };
      return { kind: "assignment", name, expression };
    }

    if (/^\s*[A-Za-z_][A-Za-z_0-9]*\s*:\s*$/.test(value)) return null;
    if (deferBareIdentifier && /^\s*[A-Za-z_][A-Za-z_0-9]*\s*$/.test(value))
      return null;
    return {
      kind: "expression",
      expression: this.expressionFromEditorValue(value),
    };
  }

  async mount(
    host: HTMLElement,
    expression: MathExpression,
    callbacks: MathEditorCallbacks,
    deferBareIdentifier = false,
  ): Promise<() => void> {
    const { MathfieldElement } = await import("mathlive");
    const field = new MathfieldElement();
    let deferIdentifier = deferBareIdentifier;
    host.replaceChildren(field);
    field.value = this.expressionToEditorValue(expression);
    field.mathVirtualKeyboardPolicy = "manual";
    field.inlineShortcuts = { ...field.inlineShortcuts, ...greekShortcuts };

    const input = () => {
      try {
        const statement = this.statementFromEditorValue(
          field.getValue("ascii-math"),
          deferIdentifier,
        );
        if (!statement) {
          callbacks.onPending();
        } else if (statement.kind === "assignment") {
          deferIdentifier = false;
          callbacks.onAssignment(statement.name, statement.expression);
          field.value = this.expressionToEditorValue(statement.expression);
        } else {
          callbacks.onExpression(statement.expression);
        }
      } catch (error) {
        callbacks.onInvalid(
          error instanceof Error
            ? error.message
            : "Unsupported mathematical structure",
        );
      }
    };
    const keydown = (event: KeyboardEvent) => {
      const pendingAssignmentName =
        event.key === " "
          ? valueBeforeSpacedAssignment(field.getValue("ascii-math"))
          : null;
      if (pendingAssignmentName) {
        event.preventDefault();
        callbacks.onAssignment(pendingAssignmentName, { kind: "empty" });
        field.value = "";
        return;
      }

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

function valueBeforeSpacedAssignment(value: string): string | null {
  return value.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*:\s*$/)?.[1] ?? null;
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
