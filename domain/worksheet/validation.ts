import { z } from "zod";
import type { MathExpression } from "../expressions/ast";
import { getUnit } from "../units/registry";
import type { WorksheetDocument } from "./model";

const identifierSchema = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z_0-9]*$/)
  .max(128);

export const mathExpressionSchema: z.ZodType<MathExpression> = z.lazy(() =>
  z.union([
    z.object({ kind: z.literal("empty") }).strict(),
    z
      .object({ kind: z.literal("number"), value: z.number().finite() })
      .strict(),
    z
      .object({ kind: z.literal("identifier"), name: identifierSchema })
      .strict(),
    z
      .object({ kind: z.literal("constant"), name: z.enum(["pi", "e"]) })
      .strict(),
    z
      .object({
        kind: z.literal("quantity"),
        magnitude: mathExpressionSchema,
        unit: z.string().min(1).max(32),
      })
      .strict(),
    z
      .object({
        kind: z.literal("unary"),
        operator: z.enum(["positive", "negative"]),
        operand: mathExpressionSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("binary"),
        operator: z.enum(["add", "subtract", "multiply", "divide", "power"]),
        left: mathExpressionSchema,
        right: mathExpressionSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("function"),
        name: z.enum(["abs", "cos", "exp", "ln", "log", "sin", "sqrt", "tan"]),
        argument: mathExpressionSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("fraction"),
        numerator: mathExpressionSchema,
        denominator: mathExpressionSchema,
      })
      .strict(),
    z
      .object({ kind: z.literal("root"), radicand: mathExpressionSchema })
      .strict(),
    z
      .object({
        kind: z.literal("power"),
        base: mathExpressionSchema,
        exponent: mathExpressionSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("subscript"),
        base: mathExpressionSchema,
        subscript: mathExpressionSchema,
      })
      .strict(),
  ]),
) as z.ZodType<MathExpression>;

const mathStatementSchema = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("expression"), expression: mathExpressionSchema })
    .strict(),
  z
    .object({
      kind: z.literal("assignment"),
      name: identifierSchema,
      expression: mathExpressionSchema,
    })
    .strict(),
]);

const baseRegionSchema = z
  .object({
    id: z.string().min(1).max(128),
    position: z
      .object({
        x: z.number().finite().min(0).max(2100),
        y: z.number().finite().min(0).max(2970),
      })
      .strict(),
    size: z
      .object({
        width: z.number().positive().max(2100),
        height: z.number().positive().max(2970),
      })
      .strict()
      .optional(),
    zIndex: z.number().int().min(0).max(10000),
  })
  .strict();

export const worksheetDocumentSchema: z.ZodType<WorksheetDocument> = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(128),
    title: z.string().trim().min(1).max(160),
    settings: z
      .object({
        page: z
          .object({
            width: z.number().positive().max(2000),
            height: z.number().positive().max(3000),
            unit: z.literal("mm"),
          })
          .strict(),
        grid: z
          .object({
            visible: z.boolean(),
            spacing: z.number().positive().max(100),
          })
          .strict(),
      })
      .strict(),
    regions: z
      .array(
        z.discriminatedUnion("type", [
          baseRegionSchema.extend({
            type: z.literal("math"),
            content: mathStatementSchema,
          }),
          baseRegionSchema.extend({
            type: z.literal("text"),
            content: z.string().max(20000),
            presentation: z
              .object({ role: z.enum(["body", "heading"]) })
              .strict()
              .optional(),
          }),
        ]),
      )
      .max(2000),
  })
  .strict() as z.ZodType<WorksheetDocument>;

export function validateWorksheetDocument(value: unknown): WorksheetDocument {
  const document = worksheetDocumentSchema.parse(value);
  const regionIds = new Set<string>();
  for (const region of document.regions) {
    if (regionIds.has(region.id)) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["regions", region.id],
          message: `Duplicate region ID "${region.id}"`,
        },
      ]);
    }
    regionIds.add(region.id);
    if (
      region.position.x > document.settings.page.width ||
      region.position.y > document.settings.page.height ||
      (region.size &&
        (region.position.x + region.size.width > document.settings.page.width ||
          region.position.y + region.size.height >
            document.settings.page.height))
    ) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["regions", region.id, "position"],
          message:
            "Region position and size must fit within the worksheet page",
        },
      ]);
    }
    if (region.type === "math")
      assertExpressionDepth(region.content.expression, 0);
  }
  return document;
}

function assertExpressionDepth(
  expression: MathExpression,
  depth: number,
): void {
  if (depth > 100)
    throw new z.ZodError([
      {
        code: "custom",
        path: ["regions", "content"],
        message: "Expression nesting exceeds 100 levels",
      },
    ]);
  switch (expression.kind) {
    case "unary":
      assertExpressionDepth(expression.operand, depth + 1);
      break;
    case "binary":
      assertExpressionDepth(expression.left, depth + 1);
      assertExpressionDepth(expression.right, depth + 1);
      break;
    case "function":
      assertExpressionDepth(expression.argument, depth + 1);
      break;
    case "fraction":
      assertExpressionDepth(expression.numerator, depth + 1);
      assertExpressionDepth(expression.denominator, depth + 1);
      break;
    case "root":
      assertExpressionDepth(expression.radicand, depth + 1);
      break;
    case "power":
      assertExpressionDepth(expression.base, depth + 1);
      assertExpressionDepth(expression.exponent, depth + 1);
      break;
    case "subscript":
      assertExpressionDepth(expression.base, depth + 1);
      assertExpressionDepth(expression.subscript, depth + 1);
      break;
    case "quantity":
      try {
        getUnit(expression.unit);
      } catch {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["regions", "content", "unit"],
            message: `Unknown unit "${expression.unit}"`,
          },
        ]);
      }
      assertExpressionDepth(expression.magnitude, depth + 1);
      break;
    case "empty":
    case "number":
    case "identifier":
    case "constant":
      break;
  }
}
