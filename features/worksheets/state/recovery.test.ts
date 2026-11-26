import { describe, expect, it } from "vitest";
import { starterDocument } from "../model/starter-document";
import { loadLocalRecovery, saveLocalRecovery } from "./recovery";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("local worksheet recovery", () => {
  it("round-trips an AST document with its optimistic base revision", () => {
    const storage = new MemoryStorage();
    saveLocalRecovery(storage, starterDocument, 4);
    expect(loadLocalRecovery(storage)).toEqual({
      document: starterDocument,
      baseRevision: 4,
    });
  });

  it("loads old prototype storage as a draft without a trusted base revision", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "forma-worksheet-v1",
      JSON.stringify({
        title: "Recovered calculation",
        regions: [
          { id: "load", type: "math", content: "load := 12", x: 7, y: 8 },
        ],
      }),
    );
    expect(loadLocalRecovery(storage)).toMatchObject({
      baseRevision: null,
      document: {
        title: "Recovered calculation",
        regions: [{ content: { kind: "assignment", name: "load" } }],
      },
    });
  });

  it("does not migrate unscoped legacy drafts into a signed-in user's scope", () => {
    const storage = new MemoryStorage();
    storage.setItem("forma-worksheet-v1", JSON.stringify(starterDocument));

    expect(loadLocalRecovery(storage, "another-user")).toBeNull();
    expect(loadLocalRecovery(storage)).toMatchObject({
      document: starterDocument,
      baseRevision: null,
    });
  });
});
