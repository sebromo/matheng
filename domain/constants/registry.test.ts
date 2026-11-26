import { describe, expect, it } from "vitest";
import { getPhysicalConstant, physicalConstants } from "./registry";

describe("physical constant registry", () => {
  it("returns structured sourced values rather than bare numeric literals", () => {
    const speedOfLight = getPhysicalConstant("speed-of-light");
    expect(speedOfLight).toMatchObject({
      value: 299792458,
      unit: "m/s",
      sourceVersion: "2019 SI",
    });
    expect(
      physicalConstants.every(
        (constant) =>
          constant.source.length > 0 && constant.sourceVersion.length > 0,
      ),
    ).toBe(true);
  });
});
