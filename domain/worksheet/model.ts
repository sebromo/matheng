import type { MathStatement } from "../expressions/ast";

export type Point = { x: number; y: number };
export type RegionSize = { width: number; height: number };

export type RegionBase = {
  id: string;
  position: Point;
  size?: RegionSize;
  zIndex: number;
};

export type MathRegion = RegionBase & {
  type: "math";
  content: MathStatement;
};

export type TextRegion = RegionBase & {
  type: "text";
  content: string;
  presentation?: { role?: "body" | "heading" };
};

export type WorksheetRegion = MathRegion | TextRegion;

export type WorksheetDocument = {
  schemaVersion: 1;
  id: string;
  title: string;
  settings: {
    page: { width: number; height: number; unit: "mm" };
    grid: { visible: boolean; spacing: number };
  };
  regions: WorksheetRegion[];
};

export const DEFAULT_PAGE = { width: 210, height: 297, unit: "mm" as const };
