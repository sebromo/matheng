import "server-only";
import { getDatabase } from "../database/client";
import { DrizzleWorksheetRepository } from "../repositories/drizzle-worksheet-repository";
import { WorksheetService } from "./worksheet-service";

let worksheetService: WorksheetService | undefined;

export function getWorksheetService(): WorksheetService {
  worksheetService ??= new WorksheetService(
    new DrizzleWorksheetRepository(getDatabase()),
  );
  return worksheetService;
}
