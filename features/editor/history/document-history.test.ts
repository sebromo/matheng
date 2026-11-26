import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE,
  type WorksheetDocument,
} from "../../../domain/worksheet/model";
import { DocumentHistory } from "./document-history";

const document: WorksheetDocument = {
  schemaVersion: 1,
  id: "history-test",
  title: "Initial",
  settings: { page: DEFAULT_PAGE, grid: { visible: true, spacing: 4.25 } },
  regions: [],
};

describe("document command history", () => {
  it("supports command execution, undo, redo, and future invalidation", () => {
    const history = new DocumentHistory(document);
    history.execute({ type: "rename-worksheet", title: "Edited" });
    expect(history.getSnapshot()).toMatchObject({
      document: { title: "Edited" },
      canUndo: true,
      canRedo: false,
    });
    history.undo();
    expect(history.getSnapshot()).toMatchObject({
      document: { title: "Initial" },
      canUndo: false,
      canRedo: true,
    });
    history.redo();
    history.undo();
    history.execute({ type: "rename-worksheet", title: "Another edit" });
    expect(history.getSnapshot()).toMatchObject({
      document: { title: "Another edit" },
      canRedo: false,
    });
  });

  it("bounds retained history", () => {
    const history = new DocumentHistory(document, 2);
    history.execute({ type: "rename-worksheet", title: "1" });
    history.execute({ type: "rename-worksheet", title: "2" });
    history.execute({ type: "rename-worksheet", title: "3" });
    history.undo();
    history.undo();
    expect(history.getSnapshot()).toMatchObject({
      document: { title: "1" },
      canUndo: false,
    });
  });

  it("groups rapid edits to one target into a single undo step", () => {
    const history = new DocumentHistory(document);
    history.execute(
      { type: "rename-worksheet", title: "S" },
      "worksheet:title",
    );
    history.execute(
      { type: "rename-worksheet", title: "Sh" },
      "worksheet:title",
    );
    history.execute(
      { type: "rename-worksheet", title: "Shaft" },
      "worksheet:title",
    );
    history.undo();
    expect(history.getSnapshot().document.title).toBe("Initial");
  });
});
