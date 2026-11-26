import { parseMathStatement } from "../../../domain/expressions/parser";
import {
  DEFAULT_PAGE,
  type WorksheetDocument,
} from "../../../domain/worksheet/model";

export const starterDocument: WorksheetDocument = {
  schemaVersion: 1,
  id: "forma-starter",
  title: "Shaft fatigue worksheet",
  settings: { page: DEFAULT_PAGE, grid: { visible: true, spacing: 4.25 } },
  regions: [
    {
      id: "heading",
      type: "text",
      content: "Shaft fatigue calculation",
      position: { x: 14.7, y: 20.79 },
      zIndex: 0,
      presentation: { role: "heading" },
    },
    {
      id: "description",
      type: "text",
      content: "Bending moment at the shoulder of a machined shaft",
      position: { x: 14.7, y: 38.61 },
      zIndex: 1,
    },
    {
      id: "load",
      type: "math",
      content: parseMathStatement("load := 142.35"),
      position: { x: 14.7, y: 62.37 },
      zIndex: 2,
    },
    {
      id: "arm",
      type: "math",
      content: parseMathStatement("arm := 2.79"),
      position: { x: 14.7, y: 77.22 },
      zIndex: 3,
    },
    {
      id: "moment",
      type: "math",
      content: parseMathStatement("moment := load * arm"),
      position: { x: 14.7, y: 92.07 },
      zIndex: 4,
    },
    {
      id: "note",
      type: "text",
      content: "The result updates as the worksheet changes.",
      position: { x: 14.7, y: 112.86 },
      zIndex: 5,
    },
  ],
};
