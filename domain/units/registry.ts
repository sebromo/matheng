import type { Dimension, UnitDefinition, UnitKind } from "./model";

const dimension = (values: Partial<Dimension> = {}): Dimension => ({
  length: values.length ?? 0,
  mass: values.mass ?? 0,
  time: values.time ?? 0,
  electricCurrent: values.electricCurrent ?? 0,
  temperature: values.temperature ?? 0,
  amount: values.amount ?? 0,
  luminousIntensity: values.luminousIntensity ?? 0,
});

const linear = (
  symbol: string,
  name: string,
  dimensions: Dimension,
  scaleToSI: number,
): UnitDefinition => ({
  symbol,
  name,
  dimension: dimensions,
  scaleToSI,
  offsetToSI: 0,
  kind: "linear",
});

const temperature = (
  symbol: string,
  name: string,
  scaleToSI: number,
  offsetToSI: number,
  kind: UnitKind,
): UnitDefinition => ({
  symbol,
  name,
  dimension: dimension({ temperature: 1 }),
  scaleToSI,
  offsetToSI,
  kind,
});

export const unitDefinitions: readonly UnitDefinition[] = [
  linear("m", "metre", dimension({ length: 1 }), 1),
  linear("mm", "millimetre", dimension({ length: 1 }), 1e-3),
  linear("cm", "centimetre", dimension({ length: 1 }), 1e-2),
  linear("km", "kilometre", dimension({ length: 1 }), 1e3),
  linear("kg", "kilogram", dimension({ mass: 1 }), 1),
  linear("g", "gram", dimension({ mass: 1 }), 1e-3),
  linear("s", "second", dimension({ time: 1 }), 1),
  linear("min", "minute", dimension({ time: 1 }), 60),
  linear("h", "hour", dimension({ time: 1 }), 3600),
  linear("rad", "radian", dimension(), 1),
  linear("deg", "degree", dimension(), Math.PI / 180),
  linear("N", "newton", dimension({ length: 1, mass: 1, time: -2 }), 1),
  linear("kN", "kilonewton", dimension({ length: 1, mass: 1, time: -2 }), 1e3),
  linear("Pa", "pascal", dimension({ length: -1, mass: 1, time: -2 }), 1),
  linear(
    "kPa",
    "kilopascal",
    dimension({ length: -1, mass: 1, time: -2 }),
    1e3,
  ),
  linear(
    "MPa",
    "megapascal",
    dimension({ length: -1, mass: 1, time: -2 }),
    1e6,
  ),
  linear(
    "GPa",
    "gigapascal",
    dimension({ length: -1, mass: 1, time: -2 }),
    1e9,
  ),
  linear("J", "joule", dimension({ length: 2, mass: 1, time: -2 }), 1),
  linear("W", "watt", dimension({ length: 2, mass: 1, time: -3 }), 1),
  temperature("K", "kelvin", 1, 0, "absolute-temperature"),
  temperature("degC", "degree Celsius", 1, 273.15, "absolute-temperature"),
  temperature(
    "delta_K",
    "kelvin temperature difference",
    1,
    0,
    "temperature-difference",
  ),
  temperature(
    "delta_degC",
    "Celsius temperature difference",
    1,
    0,
    "temperature-difference",
  ),
];

const registry = new Map(unitDefinitions.map((unit) => [unit.symbol, unit]));

export function getUnit(symbol: string): UnitDefinition {
  const unit = registry.get(symbol);
  if (!unit) throw new UnitError("unknown-unit", `Unknown unit "${symbol}"`);
  return unit;
}

export class UnitError extends Error {
  constructor(
    readonly code:
      | "unknown-unit"
      | "dimension-mismatch"
      | "temperature-kind-mismatch"
      | "invalid-magnitude"
      | "division-by-zero",
    message: string,
  ) {
    super(message);
  }
}
