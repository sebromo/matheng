import { describe, expect, it } from "vitest";
import { parseMathStatement } from "../../../domain/expressions/parser";
import { MathLiveAdapter } from "./mathlive-adapter";

describe("MathLive adapter", () => {
  const adapter = new MathLiveAdapter();

  it("converts supported editor output to Forma's structured expression tree", () => {
    expect(adapter.expressionFromEditorValue("((load * arm) / 2)")).toEqual({
      kind: "fraction",
      numerator: {
        kind: "binary",
        operator: "multiply",
        left: { kind: "identifier", name: "load" },
        right: { kind: "identifier", name: "arm" },
      },
      denominator: { kind: "number", value: 2 },
    });
  });

  it("reconstructs editable visual notation from the domain AST", () => {
    const statement = parseMathStatement("shear := torque * radius / polar");
    if (statement.kind !== "assignment")
      throw new Error("Expected assignment fixture");
    expect(adapter.expressionToEditorValue(statement.expression)).toBe(
      "\\frac{\\mathrm{torque} \\cdot \\mathrm{radius}}{\\mathrm{polar}}",
    );
  });

  it("does not accept editor markup or assignment syntax as an expression", () => {
    expect(() =>
      adapter.expressionFromEditorValue("\\htmlData{onclick}{x}"),
    ).toThrow();
    expect(() => adapter.expressionFromEditorValue("load := 2")).toThrow(
      "separately",
    );
  });

  it("round-trips an empty editable region without inserting a fake zero", () => {
    expect(adapter.expressionFromEditorValue("")).toEqual({ kind: "empty" });
    expect(adapter.expressionToEditorValue({ kind: "empty" })).toBe("");
  });

  it("treats a trailing equals sign as an evaluation request", () => {
    expect(adapter.expressionFromEditorValue("x=")).toEqual({
      kind: "identifier",
      name: "x",
    });
  });
});
