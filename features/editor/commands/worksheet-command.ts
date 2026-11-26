import type {
  WorksheetDocument,
  WorksheetRegion,
} from "../../../domain/worksheet/model";

export type WorksheetCommand =
  | { type: "insert-region"; region: WorksheetRegion }
  | { type: "replace-region"; region: WorksheetRegion }
  | { type: "delete-region"; regionId: string }
  | {
      type: "move-region";
      regionId: string;
      position: { x: number; y: number };
    }
  | { type: "rename-worksheet"; title: string };

export function applyWorksheetCommand(
  document: WorksheetDocument,
  command: WorksheetCommand,
): WorksheetDocument {
  switch (command.type) {
    case "insert-region":
      if (document.regions.some((region) => region.id === command.region.id))
        throw new Error("Region ID already exists");
      return { ...document, regions: [...document.regions, command.region] };
    case "replace-region":
      return {
        ...document,
        regions: document.regions.map((region) =>
          region.id === command.region.id ? command.region : region,
        ),
      };
    case "delete-region":
      return {
        ...document,
        regions: document.regions.filter(
          (region) => region.id !== command.regionId,
        ),
      };
    case "move-region":
      return {
        ...document,
        regions: document.regions.map((region) =>
          region.id === command.regionId
            ? { ...region, position: command.position }
            : region,
        ),
      };
    case "rename-worksheet":
      return { ...document, title: command.title };
  }
}
