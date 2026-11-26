import type { WorksheetDocument } from "../../domain/worksheet/model";

export type WorksheetAccess = "owner" | "editor" | "viewer";

export type WorksheetApiRecord = {
  document: WorksheetDocument;
  ownerId: string;
  permission: WorksheetAccess;
  revision: number;
  updatedAt: string;
};

export type ApiSuccess<T> = { data: T };
export type ApiFailure = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
};
