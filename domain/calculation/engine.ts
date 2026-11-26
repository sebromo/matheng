import type { FunctionName, MathExpression } from "../expressions/ast";
import type { MathRegion, WorksheetDocument } from "../worksheet/model";
import type {
  CalculationErrorCode,
  CalculationResult,
  RegionCalculationResult,
} from "./types";

class CalculationFailure extends Error {
  constructor(
    readonly code: CalculationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

type Definition = { region: MathRegion; name: string };

export function calculateWorksheet(
  document: WorksheetDocument,
): CalculationResult {
  return calculateWithPrevious(document);
}

export class CalculationSession {
  private document: WorksheetDocument | null = null;
  private result: CalculationResult | null = null;

  calculate(document: WorksheetDocument): CalculationResult {
    this.result = calculateWithPrevious(document, this.document, this.result);
    this.document = document;
    return this.result;
  }
}

function calculateWithPrevious(
  document: WorksheetDocument,
  previousDocument?: WorksheetDocument | null,
  previousResult?: CalculationResult | null,
): CalculationResult {
  const mathRegions = document.regions.filter(
    (region): region is MathRegion => region.type === "math",
  );
  const definitions = new Map<string, Definition[]>();
  const resultById: Record<string, RegionCalculationResult> = {};
  const variables: Record<string, number> = {};
  const changedIds =
    previousDocument && previousResult
      ? changedMathRegionIds(previousDocument, document)
      : new Set(mathRegions.map((region) => region.id));

  for (const region of mathRegions) {
    if (
      region.content.kind === "expression" &&
      region.content.expression.kind === "empty"
    ) {
      resultById[region.id] = { status: "pending" };
      continue;
    }
    if (region.content.kind !== "assignment") continue;
    const current = definitions.get(region.content.name) ?? [];
    current.push({ region, name: region.content.name });
    definitions.set(region.content.name, current);
  }

  const uniqueDefinitions = new Map<string, Definition>();
  const dependencies: Record<string, string[]> = {};
  for (const [name, entries] of definitions) {
    if (entries.length > 1) {
      for (const { region } of entries) {
        resultById[region.id] = error(
          "duplicate-definition",
          `"${name}" is defined more than once`,
        );
      }
    } else {
      uniqueDefinitions.set(name, entries[0]);
    }
  }
  const definitionsById = new Map(
    [...uniqueDefinitions.values()].map((definition) => [
      definition.region.id,
      definition,
    ]),
  );

  for (const region of mathRegions) {
    const expression = region.content.expression;
    const names = collectIdentifiers(expression);
    dependencies[region.id] = [
      ...new Set(
        names.flatMap((name) => {
          const definition = uniqueDefinitions.get(name);
          return definition ? [definition.region.id] : [];
        }),
      ),
    ];
  }

  const invalidated =
    previousDocument && previousResult
      ? dependentClosure(
          changedIds,
          previousDocument,
          document,
          previousResult.dependencies,
          dependencies,
        )
      : new Set(mathRegions.map((region) => region.id));

  if (previousResult) {
    for (const region of mathRegions) {
      const previous = previousResult.regions[region.id];
      if (!invalidated.has(region.id) && previous)
        resultById[region.id] = previous;
    }
  }

  for (const [name, entries] of definitions) {
    if (entries.length !== 1) continue;
    const definition = entries[0];
    const previous = resultById[definition.region.id];
    if (previous?.status === "success") variables[name] = previous.value;
  }

  const cyclic = findCycles(uniqueDefinitions, dependencies);
  const evaluationOrder = topologicalOrder(
    uniqueDefinitions,
    dependencies,
    cyclic,
  );
  const evaluatedRegionIds: string[] = [];

  for (const id of cyclic)
    resultById[id] = error(
      "circular-dependency",
      "Circular variable definition",
    );

  for (const id of evaluationOrder) {
    const definition = definitionsById.get(id);
    if (!definition || resultById[id]) continue;
    if (!invalidated.has(id)) continue;

    const failedDependency = dependencies[id].find(
      (dependencyId) => resultById[dependencyId]?.status === "error",
    );
    if (failedDependency) {
      resultById[id] = error(
        "dependency-failed",
        "A referenced calculation did not succeed",
      );
      continue;
    }

    try {
      const value = evaluateExpression(
        definition.region.content.expression,
        variables,
        definitions,
      );
      variables[definition.name] = value;
      resultById[id] = { status: "success", value };
    } catch (failure) {
      resultById[id] = toResult(failure);
    }
    evaluatedRegionIds.push(id);
  }

  for (const region of mathRegions) {
    if (
      region.content.kind !== "expression" ||
      (resultById[region.id] && !invalidated.has(region.id))
    )
      continue;
    if (region.content.expression.kind === "empty") {
      resultById[region.id] = { status: "pending" };
      continue;
    }
    if (!invalidated.has(region.id)) continue;
    try {
      resultById[region.id] = {
        status: "success",
        value: evaluateExpression(
          region.content.expression,
          variables,
          definitions,
        ),
      };
    } catch (failure) {
      resultById[region.id] = toResult(failure);
    }
    evaluatedRegionIds.push(region.id);
  }

  return {
    regions: resultById,
    variables,
    dependencies,
    evaluationOrder,
    evaluatedRegionIds,
  };
}

function changedMathRegionIds(
  previous: WorksheetDocument,
  current: WorksheetDocument,
): Set<string> {
  const priorById = new Map(
    previous.regions
      .filter((region): region is MathRegion => region.type === "math")
      .map((region) => [region.id, region]),
  );
  const currentById = new Map(
    current.regions
      .filter((region): region is MathRegion => region.type === "math")
      .map((region) => [region.id, region]),
  );
  const changed = new Set<string>();
  for (const id of new Set([...priorById.keys(), ...currentById.keys()])) {
    if (
      JSON.stringify(priorById.get(id)) !== JSON.stringify(currentById.get(id))
    )
      changed.add(id);
  }
  return changed;
}

function dependentClosure(
  changedIds: Set<string>,
  previousDocument: WorksheetDocument,
  currentDocument: WorksheetDocument,
  previousDependencies: Record<string, string[]>,
  currentDependencies: Record<string, string[]>,
): Set<string> {
  const previousNames = assignmentNames(previousDocument);
  const currentNames = assignmentNames(currentDocument);
  const changedNames = new Set<string>();
  for (const id of changedIds) {
    const previousName = previousNames.get(id);
    const currentName = currentNames.get(id);
    if (previousName) changedNames.add(previousName);
    if (currentName) changedNames.add(currentName);
  }
  for (const [id, name] of previousNames)
    if (changedNames.has(name)) changedIds.add(id);
  for (const [id, name] of currentNames)
    if (changedNames.has(name)) changedIds.add(id);

  const reverseGraphs = [
    reverseDependencies(previousDependencies),
    reverseDependencies(currentDependencies),
  ];
  const invalidated = new Set(changedIds);
  const queue = [...changedIds];
  while (queue.length) {
    const dependencyId = queue.pop()!;
    for (const reverse of reverseGraphs) {
      for (const dependentId of reverse.get(dependencyId) ?? []) {
        if (!invalidated.has(dependentId)) {
          invalidated.add(dependentId);
          queue.push(dependentId);
        }
      }
    }
  }
  return invalidated;
}

function assignmentNames(document: WorksheetDocument): Map<string, string> {
  return new Map(
    document.regions.flatMap((region) =>
      region.type === "math" && region.content.kind === "assignment"
        ? [[region.id, region.content.name] as const]
        : [],
    ),
  );
}

function reverseDependencies(
  dependencies: Record<string, string[]>,
): Map<string, string[]> {
  const reverse = new Map<string, string[]>();
  for (const [regionId, dependencyIds] of Object.entries(dependencies)) {
    for (const dependencyId of dependencyIds) {
      const dependents = reverse.get(dependencyId) ?? [];
      dependents.push(regionId);
      reverse.set(dependencyId, dependents);
    }
  }
  return reverse;
}

function evaluateExpression(
  expression: MathExpression,
  variables: Record<string, number>,
  definitions: Map<string, Definition[]>,
): number {
  let value: number;
  switch (expression.kind) {
    case "number":
      value = expression.value;
      break;
    case "empty":
      throw new CalculationFailure(
        "invalid-expression",
        "Enter a mathematical expression",
      );
    case "constant":
      value = expression.name === "pi" ? Math.PI : Math.E;
      break;
    case "quantity":
      throw new CalculationFailure(
        "unsupported-operation",
        "Quantity expressions require dimensional calculation support",
      );
    case "identifier": {
      const matches = definitions.get(expression.name);
      if (matches && matches.length > 1)
        throw new CalculationFailure(
          "duplicate-definition",
          `"${expression.name}" is defined more than once`,
        );
      if (!Object.hasOwn(variables, expression.name))
        throw new CalculationFailure(
          "undefined-variable",
          `"${expression.name}" is not defined`,
        );
      value = variables[expression.name];
      break;
    }
    case "unary": {
      const operand = evaluateExpression(
        expression.operand,
        variables,
        definitions,
      );
      value = expression.operator === "negative" ? -operand : operand;
      break;
    }
    case "binary": {
      const left = evaluateExpression(expression.left, variables, definitions);
      const right = evaluateExpression(
        expression.right,
        variables,
        definitions,
      );
      switch (expression.operator) {
        case "add":
          value = left + right;
          break;
        case "subtract":
          value = left - right;
          break;
        case "multiply":
          value = left * right;
          break;
        case "divide":
          value = divide(left, right);
          break;
        case "power":
          value = left ** right;
          break;
      }
      break;
    }
    case "fraction":
      value = divide(
        evaluateExpression(expression.numerator, variables, definitions),
        evaluateExpression(expression.denominator, variables, definitions),
      );
      break;
    case "power":
      value =
        evaluateExpression(expression.base, variables, definitions) **
        evaluateExpression(expression.exponent, variables, definitions);
      break;
    case "root":
      value = Math.sqrt(
        evaluateExpression(expression.radicand, variables, definitions),
      );
      break;
    case "function": {
      const argument = evaluateExpression(
        expression.argument,
        variables,
        definitions,
      );
      const functions: Record<FunctionName, (value: number) => number> = {
        abs: Math.abs,
        cos: Math.cos,
        exp: Math.exp,
        ln: Math.log,
        log: Math.log10,
        sin: Math.sin,
        sqrt: Math.sqrt,
        tan: Math.tan,
      };
      value = functions[expression.name](argument);
      break;
    }
    case "subscript":
      throw new CalculationFailure(
        "unsupported-operation",
        "Subscripted expressions are not yet numerically evaluable",
      );
  }

  if (!Number.isFinite(value))
    throw new CalculationFailure(
      "numerical-failure",
      "The result is not a finite real number",
    );
  return value;
}

function divide(numerator: number, denominator: number): number {
  if (denominator === 0)
    throw new CalculationFailure("division-by-zero", "Division by zero");
  return numerator / denominator;
}

function collectIdentifiers(expression: MathExpression): string[] {
  switch (expression.kind) {
    case "identifier":
      return [expression.name];
    case "unary":
      return collectIdentifiers(expression.operand);
    case "binary":
      return [
        ...collectIdentifiers(expression.left),
        ...collectIdentifiers(expression.right),
      ];
    case "function":
      return collectIdentifiers(expression.argument);
    case "fraction":
      return [
        ...collectIdentifiers(expression.numerator),
        ...collectIdentifiers(expression.denominator),
      ];
    case "root":
      return collectIdentifiers(expression.radicand);
    case "power":
      return [
        ...collectIdentifiers(expression.base),
        ...collectIdentifiers(expression.exponent),
      ];
    case "subscript":
      return [
        ...collectIdentifiers(expression.base),
        ...collectIdentifiers(expression.subscript),
      ];
    case "quantity":
      return collectIdentifiers(expression.magnitude);
    case "empty":
    case "number":
    case "constant":
      return [];
  }
}

function findCycles(
  definitions: Map<string, Definition>,
  dependencies: Record<string, string[]>,
): Set<string> {
  const colors = new Map<string, "visiting" | "complete">();
  const stack: string[] = [];
  const cyclic = new Set<string>();

  function visit(id: string): void {
    if (colors.get(id) === "complete") return;
    if (colors.get(id) === "visiting") {
      const start = stack.indexOf(id);
      for (const cycleId of stack.slice(start)) cyclic.add(cycleId);
      return;
    }
    colors.set(id, "visiting");
    stack.push(id);
    for (const dependencyId of dependencies[id] ?? []) {
      if (definitionsHasId(definitions, dependencyId)) visit(dependencyId);
    }
    stack.pop();
    colors.set(id, "complete");
  }

  for (const definition of definitions.values()) visit(definition.region.id);
  return cyclic;
}

function topologicalOrder(
  definitions: Map<string, Definition>,
  dependencies: Record<string, string[]>,
  cyclic: Set<string>,
): string[] {
  const order: string[] = [];
  const visited = new Set<string>();

  function visit(id: string): void {
    if (visited.has(id) || cyclic.has(id)) return;
    visited.add(id);
    for (const dependencyId of dependencies[id] ?? []) visit(dependencyId);
    order.push(id);
  }

  for (const definition of definitions.values()) visit(definition.region.id);
  return order;
}

function definitionsHasId(
  definitions: Map<string, Definition>,
  id: string,
): boolean {
  return [...definitions.values()].some(
    (definition) => definition.region.id === id,
  );
}

function error(
  code: CalculationErrorCode,
  message: string,
): RegionCalculationResult {
  return { status: "error", code, message };
}

function toResult(failure: unknown): RegionCalculationResult {
  if (failure instanceof CalculationFailure)
    return error(failure.code, failure.message);
  return error("invalid-expression", "Unable to evaluate this expression");
}
