import { describe, expect, it } from "vitest";
import type { MathExpression } from "../expressions/ast";
import { parseMathStatement } from "../expressions/parser";
import type { WorksheetDocument } from "./model";
import { deserializeWorksheet, serializeWorksheet } from "./serialization";

const worksheet: WorksheetDocument = {
  schemaVersion: 1,
  id: "test-document",
  title: "Shaft calculation",
  settings: {
    page: { width: 210, height: 297, unit: "mm" },
    grid: { visible: true, spacing: 4.25 },
  },
  regions: [
    {
      id: "label",
      type: "text",
      content: "Torque",
      position: { x: 14.7, y: 29.7 },
      zIndex: 0,
    },
    {
      id: "torque",
      type: "math",
      content: parseMathStatement("load * arm"),
      position: { x: 14.7, y: 92.07 },
      zIndex: 1,
    },
  ],
};

describe("worksheet serialization", () => {
  it("round-trips the validated structured document", () => {
    expect(deserializeWorksheet(serializeWorksheet(worksheet))).toEqual(
      worksheet,
    );
  });

  it("migrates the prototype document and percentage coordinates", () => {
    const migrated = deserializeWorksheet(
      JSON.stringify({
        title: "Legacy sheet",
        regions: [
          { id: "load", type: "math", content: "load := 142.35", x: 7, y: 21 },
          { id: "note", type: "text", content: "Torque", x: 7, y: 38 },
        ],
      }),
    );

    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.regions[0]).toMatchObject({
      id: "load",
      type: "math",
      position: { x: 14.7, y: 62.37 },
      content: {
        kind: "assignment",
        name: "load",
        expression: { kind: "number", value: 142.35 },
      },
    });
    expect(migrated.regions[1]).toMatchObject({
      position: { x: 14.7, y: 112.86 },
    });
  });

  it("rejects malformed, oversized, and deeply nested documents", () => {
    expect(() =>
      deserializeWorksheet(JSON.stringify({ schemaVersion: 1, regions: [] })),
    ).toThrow();
    expect(() => deserializeWorksheet(" ".repeat(2_000_001))).toThrow("2 MB");

    let expression: MathExpression = { kind: "number", value: 1 };
    for (let depth = 0; depth < 102; depth += 1) {
      expression = { kind: "unary", operator: "negative", operand: expression };
    }
    expect(() =>
      deserializeWorksheet(
        JSON.stringify({
          ...worksheet,
          regions: [
            {
              ...worksheet.regions[1],
              content: { kind: "expression", expression },
            },
          ],
        }),
      ),
    ).toThrow("nesting");
  });

  it("rejects duplicate region IDs and coordinates outside the configured page", () => {
    const duplicate = {
      ...worksheet,
      regions: [worksheet.regions[0], { ...worksheet.regions[0], zIndex: 2 }],
    };
    const outOfBounds = {
      ...worksheet,
      regions: [{ ...worksheet.regions[0], position: { x: 211, y: 0 } }],
    };
    expect(() => deserializeWorksheet(JSON.stringify(duplicate))).toThrow(
      "Duplicate region ID",
    );
    expect(() => deserializeWorksheet(JSON.stringify(outOfBounds))).toThrow(
      "fit within the worksheet page",
    );
  });

  it("rejects quantity AST nodes with unknown units", () => {
    const invalidQuantity = {
      ...worksheet,
      regions: [
        {
          ...worksheet.regions[1],
          content: {
            kind: "expression",
            expression: {
              kind: "quantity",
              magnitude: { kind: "number", value: 1 },
              unit: "lightyear",
            },
          },
        },
      ],
    };
    expect(() => deserializeWorksheet(JSON.stringify(invalidQuantity))).toThrow(
      /Unknown unit/,
    );
  });
});
