import { describe, expect, it, vi } from "vitest";
import { parseMathStatement } from "../../../domain/expressions/parser";
import { starterDocument } from "../model/starter-document";
import { CalculationStateStore } from "./calculation-state";

describe("calculation state store", () => {
  it("updates derived results outside render and reuses unaffected regions", () => {
    const store = new CalculationStateStore(starterDocument);
    const listener = vi.fn();
    store.subscribe(listener);
    const changed = {
      ...starterDocument,
      regions: starterDocument.regions.map((region) =>
        region.id === "load" && region.type === "math"
          ? { ...region, content: parseMathStatement("load := 150") }
          : region,
      ),
    };

    store.update(changed);
    expect(store.getSnapshot().result.regions.moment).toEqual({
      status: "success",
      value: 418.5,
    });
    expect(new Set(store.getSnapshot().result.evaluatedRegionIds)).toEqual(
      new Set(["load", "moment"]),
    );
    expect(listener).toHaveBeenCalledOnce();
  });
});
