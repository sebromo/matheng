import { describe, expect, it } from "vitest";
import { parseMathStatement } from "./parser";

describe("math expression parser", () => {
  it("preserves assignment and operator precedence in structured nodes", () => {
    expect(parseMathStatement("stress := load * arm / 2")).toEqual({
      kind: "assignment",
      name: "stress",
      expression: {
        kind: "fraction",
        numerator: {
          kind: "binary",
          operator: "multiply",
          left: { kind: "identifier", name: "load" },
          right: { kind: "identifier", name: "arm" },
        },
        denominator: { kind: "number", value: 2 },
      },
    });
  });

  it("maps square roots to a structural root node", () => {
    expect(parseMathStatement("sqrt(pi)")).toEqual({
      kind: "expression",
      expression: { kind: "root", radicand: { kind: "constant", name: "pi" } },
    });
  });

  it("rejects unsupported syntax without executing it", () => {
    expect(() => parseMathStatement("globalThis.process.exit()")).toThrow();
  });
});
