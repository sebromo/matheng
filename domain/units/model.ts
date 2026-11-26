export type Dimension = Readonly<{
  length: number;
  mass: number;
  time: number;
  electricCurrent: number;
  temperature: number;
  amount: number;
  luminousIntensity: number;
}>;

export type UnitKind =
  "linear" | "absolute-temperature" | "temperature-difference";

export type UnitDefinition = {
  symbol: string;
  name: string;
  dimension: Dimension;
  scaleToSI: number;
  offsetToSI: number;
  kind: UnitKind;
};

export type Quantity = {
  magnitudeSI: number;
  dimension: Dimension;
  temperatureKind: UnitKind;
  displayUnit: string;
};

export const DIMENSIONLESS: Dimension = Object.freeze({
  length: 0,
  mass: 0,
  time: 0,
  electricCurrent: 0,
  temperature: 0,
  amount: 0,
  luminousIntensity: 0,
});

export function dimensionsEqual(left: Dimension, right: Dimension): boolean {
  return Object.keys(DIMENSIONLESS).every(
    (key) => left[key as keyof Dimension] === right[key as keyof Dimension],
  );
}
