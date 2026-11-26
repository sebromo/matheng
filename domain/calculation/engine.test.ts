import { describe, expect, it } from "vitest";
import { parseMathStatement } from "../expressions/parser";
import { DEFAULT_PAGE, type WorksheetDocument } from "../worksheet/model";
import { calculateWorksheet, CalculationSession } from "./engine";

function worksheet(expressions: string[]): WorksheetDocument {
  return {
    schemaVersion: 1,
    id: "calc-test",
    title: "Calculation test",
    settings: { page: DEFAULT_PAGE, grid: { visible: true, spacing: 4.25 } },
    regions: expressions.map((content, index) => ({
      id: `math-${index}`,
      type: "math" as const,
      content: parseMathStatement(content),
      position: { x: 10, y: 10 + index * 10 },
      zIndex: index,
    })),
  };
}

describe("calculation engine", () => {
  it("resolves definitions independent of spatial order", () => {
    const result = calculateWorksheet(
      worksheet(["moment := load * arm", "load := 142.35", "arm := 2.79"]),
    );
    expect(result.regions["math-0"]).toEqual({
      status: "success",
      value: 397.1565,
    });
    expect(result.dependencies["math-0"]).toEqual(["math-1", "math-2"]);
  });

  it("detects cycles and undefined variables with structured errors", () => {
    const result = calculateWorksheet(
      worksheet(["a := b + 1", "b := a + 1", "c := missing + 2"]),
    );
    expect(result.regions["math-0"]).toMatchObject({
      status: "error",
      code: "circular-dependency",
    });
    expect(result.regions["math-1"]).toMatchObject({
      status: "error",
      code: "circular-dependency",
    });
    expect(result.regions["math-2"]).toMatchObject({
      status: "error",
      code: "undefined-variable",
    });
  });

  it("rejects duplicate definitions rather than silently choosing one", () => {
    const result = calculateWorksheet(
      worksheet(["load := 4", "load := 5", "result := load * 2"]),
    );
    expect(result.regions["math-0"]).toMatchObject({
      status: "error",
      code: "duplicate-definition",
    });
    expect(result.regions["math-1"]).toMatchObject({
      status: "error",
      code: "duplicate-definition",
    });
    expect(result.regions["math-2"]).toMatchObject({
      status: "error",
      code: "duplicate-definition",
    });
  });

  it("reports division by zero and non-real numerical results", () => {
    const result = calculateWorksheet(worksheet(["1 / 0", "sqrt(-1)"]));
    expect(result.regions["math-0"]).toMatchObject({
      status: "error",
      code: "division-by-zero",
    });
    expect(result.regions["math-1"]).toMatchObject({
      status: "error",
      code: "numerical-failure",
    });
  });

  it("calculates a shaft torque and solid-shaft torsional stress", () => {
    const result = calculateWorksheet(
      worksheet([
        "force := 1200",
        "arm := 0.35",
        "torque := force * arm",
        "diameter := 0.02",
        "polar := pi * diameter^4 / 32",
        "shear := torque * (diameter / 2) / polar",
      ]),
    );
    expect(result.variables.torque).toBe(420);
    expect(result.variables.shear).toBeCloseTo(267380304.394, 2);
  });

  it("recalculates only changed regions and their transitive dependents", () => {
    const session = new CalculationSession();
    const original = worksheet([
      "load := 142.35",
      "arm := 2.79",
      "moment := load * arm",
    ]);
    session.calculate(original);
    const changed: WorksheetDocument = {
      ...original,
      regions: original.regions.map((region) =>
        region.id === "math-0" && region.type === "math"
          ? { ...region, content: parseMathStatement("load := 150") }
          : region,
      ),
    };

    const result = session.calculate(changed);
    expect(result.variables.moment).toBeCloseTo(418.5);
    expect(new Set(result.evaluatedRegionIds)).toEqual(
      new Set(["math-0", "math-2"]),
    );

    expect(session.calculate(changed).evaluatedRegionIds).toEqual([]);
  });
});
