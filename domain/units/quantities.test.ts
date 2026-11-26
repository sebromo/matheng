import { describe, expect, it } from "vitest";
import {
  addQuantities,
  divideQuantities,
  multiplyQuantities,
  powerQuantity,
  quantity,
  subtractQuantities,
  valueInUnit,
} from "./quantities";
import { UnitError } from "./registry";

describe("SI quantity operations", () => {
  it("converts metric length, force, and pressure units", () => {
    expect(valueInUnit(quantity(25, "mm"), "m")).toBeCloseTo(0.025);
    expect(valueInUnit(quantity(3, "kN"), "N")).toBe(3000);
    expect(valueInUnit(quantity(2.5, "MPa"), "Pa")).toBe(2_500_000);
  });

  it("checks dimensions during conversion and addition", () => {
    expect(() => valueInUnit(quantity(1, "m"), "s")).toThrowError(UnitError);
    expect(() =>
      addQuantities(quantity(1, "m"), quantity(1, "s")),
    ).toThrowError(/incompatible dimensions/);
  });

  it("combines dimensions for engineering operations", () => {
    const torque = multiplyQuantities(quantity(120, "N"), quantity(0.35, "m"));
    expect(torque.magnitudeSI).toBe(42);
    const pressure = divideQuantities(
      quantity(10, "N"),
      powerQuantity(quantity(2, "m"), 2),
    );
    expect(pressure.dimension).toMatchObject({ length: -1, mass: 1, time: -2 });
  });

  it("distinguishes absolute and relative temperatures", () => {
    const difference = subtractQuantities(
      quantity(25, "degC"),
      quantity(20, "degC"),
    );
    expect(difference.temperatureKind).toBe("temperature-difference");
    expect(valueInUnit(difference, "delta_degC")).toBeCloseTo(5);
    expect(valueInUnit(quantity(0, "degC"), "K")).toBeCloseTo(273.15);
    expect(() =>
      addQuantities(quantity(20, "degC"), quantity(10, "degC")),
    ).toThrow(/cannot be added/);
  });
});
