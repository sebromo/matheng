export type BinaryOperator =
  "add" | "subtract" | "multiply" | "divide" | "power";
export type UnaryOperator = "positive" | "negative";
export type FunctionName =
  "abs" | "cos" | "exp" | "ln" | "log" | "sin" | "sqrt" | "tan";

export type MathExpression =
  | { kind: "empty" }
  | { kind: "number"; value: number }
  | { kind: "identifier"; name: string }
  | { kind: "constant"; name: "pi" | "e" }
  | { kind: "quantity"; magnitude: MathExpression; unit: string }
  | { kind: "unary"; operator: UnaryOperator; operand: MathExpression }
  | {
      kind: "binary";
      operator: BinaryOperator;
      left: MathExpression;
      right: MathExpression;
    }
  | { kind: "function"; name: FunctionName; argument: MathExpression }
  | { kind: "fraction"; numerator: MathExpression; denominator: MathExpression }
  | { kind: "root"; radicand: MathExpression }
  | { kind: "power"; base: MathExpression; exponent: MathExpression }
  | { kind: "subscript"; base: MathExpression; subscript: MathExpression };

export type MathStatement =
  | { kind: "expression"; expression: MathExpression }
  | { kind: "assignment"; name: string; expression: MathExpression };
