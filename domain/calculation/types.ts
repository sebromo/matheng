export type CalculationErrorCode =
  | "invalid-expression"
  | "undefined-variable"
  | "circular-dependency"
  | "duplicate-definition"
  | "division-by-zero"
  | "numerical-failure"
  | "unsupported-operation"
  | "dependency-failed";

export type RegionCalculationResult =
  | { status: "success"; value: number }
  | { status: "error"; code: CalculationErrorCode; message: string }
  | { status: "pending" };

export type CalculationResult = {
  regions: Record<string, RegionCalculationResult>;
  variables: Record<string, number>;
  dependencies: Record<string, string[]>;
  evaluationOrder: string[];
  evaluatedRegionIds: string[];
};
