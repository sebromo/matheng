import { dimensionsEqual, type Dimension, type Quantity } from "./model";
import { getUnit, UnitError } from "./registry";

export function quantity(magnitude: number, unitSymbol: string): Quantity {
  if (!Number.isFinite(magnitude))
    throw new UnitError(
      "invalid-magnitude",
      "Quantity magnitude must be finite",
    );
  const unit = getUnit(unitSymbol);
  return {
    magnitudeSI: magnitude * unit.scaleToSI + unit.offsetToSI,
    dimension: unit.dimension,
    temperatureKind: unit.kind,
    displayUnit: unit.symbol,
  };
}

export function valueInUnit(value: Quantity, unitSymbol: string): number {
  const unit = getUnit(unitSymbol);
  requireCompatible(value, unit.dimension, unit.kind);
  return (value.magnitudeSI - unit.offsetToSI) / unit.scaleToSI;
}

export function addQuantities(left: Quantity, right: Quantity): Quantity {
  requireSameDimension(left, right);
  let kind = left.temperatureKind;
  if (isAbsolute(left) && isAbsolute(right))
    throw temperatureError("Two absolute temperatures cannot be added");
  if (
    (isAbsolute(left) && isDifference(right)) ||
    (isDifference(left) && isAbsolute(right))
  )
    kind = "absolute-temperature";
  else if (left.temperatureKind !== right.temperatureKind)
    throw temperatureError("Temperature kinds are incompatible");
  return {
    ...left,
    magnitudeSI: left.magnitudeSI + right.magnitudeSI,
    temperatureKind: kind,
  };
}

export function subtractQuantities(left: Quantity, right: Quantity): Quantity {
  requireSameDimension(left, right);
  let kind = left.temperatureKind;
  if (isAbsolute(left) && isAbsolute(right)) kind = "temperature-difference";
  else if (isAbsolute(left) && isDifference(right))
    kind = "absolute-temperature";
  else if (isDifference(left) && isAbsolute(right))
    throw temperatureError(
      "A temperature difference cannot subtract an absolute temperature",
    );
  else if (left.temperatureKind !== right.temperatureKind)
    throw temperatureError("Temperature kinds are incompatible");
  return {
    ...left,
    magnitudeSI: left.magnitudeSI - right.magnitudeSI,
    temperatureKind: kind,
  };
}

export function multiplyQuantities(left: Quantity, right: Quantity): Quantity {
  rejectAbsoluteTemperature(left, "multiply");
  rejectAbsoluteTemperature(right, "multiply");
  return {
    magnitudeSI: left.magnitudeSI * right.magnitudeSI,
    dimension: combineDimensions(left.dimension, right.dimension, 1),
    temperatureKind: "linear",
    displayUnit: "SI",
  };
}

export function divideQuantities(left: Quantity, right: Quantity): Quantity {
  rejectAbsoluteTemperature(left, "divide");
  rejectAbsoluteTemperature(right, "divide");
  if (right.magnitudeSI === 0)
    throw new UnitError("division-by-zero", "Division by zero");
  return {
    magnitudeSI: left.magnitudeSI / right.magnitudeSI,
    dimension: combineDimensions(left.dimension, right.dimension, -1),
    temperatureKind: "linear",
    displayUnit: "SI",
  };
}

export function powerQuantity(value: Quantity, exponent: number): Quantity {
  rejectAbsoluteTemperature(value, "raise to a power");
  if (!Number.isFinite(exponent))
    throw new UnitError("invalid-magnitude", "Exponent must be finite");
  if (!isDimensionless(value.dimension) && !Number.isInteger(exponent)) {
    throw new UnitError(
      "invalid-magnitude",
      "A dimensioned quantity requires an integer exponent",
    );
  }
  return {
    magnitudeSI: value.magnitudeSI ** exponent,
    dimension: scaleDimension(value.dimension, exponent),
    temperatureKind: "linear",
    displayUnit: "SI",
  };
}

function requireSameDimension(left: Quantity, right: Quantity): void {
  if (!dimensionsEqual(left.dimension, right.dimension)) {
    throw new UnitError(
      "dimension-mismatch",
      "Quantities have incompatible dimensions",
    );
  }
}

function requireCompatible(
  value: Quantity,
  dimension: Dimension,
  kind: Quantity["temperatureKind"],
): void {
  if (!dimensionsEqual(value.dimension, dimension))
    throw new UnitError(
      "dimension-mismatch",
      "Cannot convert between incompatible dimensions",
    );
  if (value.temperatureKind !== kind)
    throw temperatureError(
      "Absolute temperatures and temperature differences are not interchangeable",
    );
}

function combineDimensions(
  left: Dimension,
  right: Dimension,
  sign: 1 | -1,
): Dimension {
  return {
    length: left.length + sign * right.length,
    mass: left.mass + sign * right.mass,
    time: left.time + sign * right.time,
    electricCurrent: left.electricCurrent + sign * right.electricCurrent,
    temperature: left.temperature + sign * right.temperature,
    amount: left.amount + sign * right.amount,
    luminousIntensity: left.luminousIntensity + sign * right.luminousIntensity,
  };
}

function scaleDimension(value: Dimension, exponent: number): Dimension {
  return {
    length: value.length * exponent,
    mass: value.mass * exponent,
    time: value.time * exponent,
    electricCurrent: value.electricCurrent * exponent,
    temperature: value.temperature * exponent,
    amount: value.amount * exponent,
    luminousIntensity: value.luminousIntensity * exponent,
  };
}

function isDimensionless(value: Dimension): boolean {
  return dimensionsEqual(value, {
    length: 0,
    mass: 0,
    time: 0,
    electricCurrent: 0,
    temperature: 0,
    amount: 0,
    luminousIntensity: 0,
  });
}

function isAbsolute(value: Quantity): boolean {
  return value.temperatureKind === "absolute-temperature";
}
function isDifference(value: Quantity): boolean {
  return value.temperatureKind === "temperature-difference";
}

function rejectAbsoluteTemperature(value: Quantity, operation: string): void {
  if (isAbsolute(value))
    throw temperatureError(
      `Absolute temperatures cannot be used in ${operation}`,
    );
}

function temperatureError(message: string): UnitError {
  return new UnitError("temperature-kind-mismatch", message);
}
