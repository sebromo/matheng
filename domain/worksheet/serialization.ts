import { parseMathStatement } from "../expressions/parser";
import {
  DEFAULT_PAGE,
  type WorksheetDocument,
  type WorksheetRegion,
} from "./model";
import { validateWorksheetDocument } from "./validation";

const MAX_DOCUMENT_BYTES = 2_000_000;

export function serializeWorksheet(document: WorksheetDocument): string {
  return JSON.stringify(validateWorksheetDocument(document));
}

export function deserializeWorksheet(serialized: string): WorksheetDocument {
  if (new TextEncoder().encode(serialized).byteLength > MAX_DOCUMENT_BYTES) {
    throw new RangeError("Worksheet document exceeds the 2 MB limit");
  }
  const value: unknown = JSON.parse(serialized);
  if (isCurrentDocument(value)) return validateWorksheetDocument(value);
  return validateWorksheetDocument(migrateLegacyDocument(value));
}

function isCurrentDocument(value: unknown): value is WorksheetDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion === 1
  );
}

function migrateLegacyDocument(value: unknown): WorksheetDocument {
  if (!isRecord(value) || !Array.isArray(value.regions))
    throw new TypeError("Unsupported worksheet document format");
  const regions: WorksheetRegion[] = [];
  value.regions.forEach((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.content !== "string"
    )
      return [];
    const position = {
      x: legacyCoordinate(item.x, DEFAULT_PAGE.width),
      y: legacyCoordinate(item.y, DEFAULT_PAGE.height),
    };
    if (item.type === "text") {
      regions.push({
        id: item.id,
        type: "text",
        content: item.content,
        position,
        zIndex: index,
      });
      return;
    }
    if (item.type === "math") {
      regions.push({
        id: item.id,
        type: "math",
        content: parseMathStatement(item.content),
        position,
        zIndex: index,
      });
    }
  });

  return {
    schemaVersion: 1,
    id: typeof value.id === "string" ? value.id : "worksheet-local",
    title:
      typeof value.title === "string" && value.title.trim()
        ? value.title
        : "Untitled worksheet",
    settings: { page: DEFAULT_PAGE, grid: { visible: true, spacing: 4.25 } },
    regions,
  };
}

function legacyCoordinate(value: unknown, dimension: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 7;
  return Number(
    Math.min(dimension, Math.max(0, (value / 100) * dimension)).toFixed(6),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
