import type {
  BinaryOperator,
  FunctionName,
  MathExpression,
  MathStatement,
} from "./ast";

type Token = { type: "number" | "name" | "operator"; value: string };

const functionNames = new Set<FunctionName>([
  "abs",
  "cos",
  "exp",
  "ln",
  "log",
  "sin",
  "sqrt",
  "tan",
]);

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const rest = source.slice(index);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) {
      index += whitespace[0].length;
      continue;
    }

    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (number) {
      tokens.push({ type: "number", value: number[0] });
      index += number[0].length;
      continue;
    }

    const name = rest.match(/^[A-Za-z_][A-Za-z_0-9]*/);
    if (name) {
      tokens.push({ type: "name", value: name[0] });
      index += name[0].length;
      continue;
    }

    const operator = rest.match(/^(?::=|[+*/^(),-])/);
    if (operator) {
      tokens.push({ type: "operator", value: operator[0] });
      index += operator[0].length;
      continue;
    }

    throw new SyntaxError(`Unexpected character "${source[index]}"`);
  }

  return tokens;
}

export function parseMathStatement(source: string): MathStatement {
  if (!source.trim())
    return { kind: "expression", expression: { kind: "empty" } };
  const tokens = tokenize(source);
  let position = 0;

  function peek(value?: string): Token | undefined {
    const token = tokens[position];
    return value === undefined || token?.value === value ? token : undefined;
  }

  function take(value?: string): Token {
    const token = peek(value);
    if (!token)
      throw new SyntaxError(
        value ? `Expected "${value}"` : "Unexpected end of expression",
      );
    position += 1;
    return token;
  }

  function primary(): MathExpression {
    const token = take();
    if (token.type === "number") {
      const value = Number(token.value);
      if (!Number.isFinite(value))
        throw new SyntaxError("Numeric literal is not finite");
      return { kind: "number", value };
    }

    if (token.value === "(") {
      const expression = addSub();
      take(")");
      return expression;
    }

    if (token.type === "name") {
      const normalized = token.value.toLowerCase();
      if (peek("(")) {
        take("(");
        const argument = addSub();
        take(")");
        if (!functionNames.has(normalized as FunctionName)) {
          throw new SyntaxError(`Unknown function "${token.value}"`);
        }
        if (normalized === "sqrt") return { kind: "root", radicand: argument };
        return { kind: "function", name: normalized as FunctionName, argument };
      }
      if (normalized === "pi" || normalized === "e")
        return { kind: "constant", name: normalized };
      return { kind: "identifier", name: token.value };
    }

    throw new SyntaxError(`Unexpected token "${token.value}"`);
  }

  function power(): MathExpression {
    const base = primary();
    if (!peek("^")) return base;
    take("^");
    return { kind: "power", base, exponent: unary() };
  }

  function unary(): MathExpression {
    if (peek("+")) {
      take("+");
      return { kind: "unary", operator: "positive", operand: unary() };
    }
    if (peek("-")) {
      take("-");
      return { kind: "unary", operator: "negative", operand: unary() };
    }
    return power();
  }

  function mulDiv(): MathExpression {
    let expression = unary();
    while (peek("*") || peek("/")) {
      const operator = take().value === "*" ? "multiply" : "divide";
      const right = unary();
      expression =
        operator === "divide"
          ? { kind: "fraction", numerator: expression, denominator: right }
          : { kind: "binary", operator, left: expression, right };
    }
    return expression;
  }

  function addSub(): MathExpression {
    let expression = mulDiv();
    while (peek("+") || peek("-")) {
      const operator: BinaryOperator =
        take().value === "+" ? "add" : "subtract";
      expression = {
        kind: "binary",
        operator,
        left: expression,
        right: mulDiv(),
      };
    }
    return expression;
  }

  let statement: MathStatement;
  if (tokens[0]?.type === "name" && tokens[1]?.value === ":=") {
    const name = take().value;
    take(":=");
    statement = { kind: "assignment", name, expression: addSub() };
  } else {
    statement = { kind: "expression", expression: addSub() };
  }

  if (position !== tokens.length)
    throw new SyntaxError(`Unexpected token "${tokens[position].value}"`);
  return statement;
}
