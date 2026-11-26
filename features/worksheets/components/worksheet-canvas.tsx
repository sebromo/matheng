"use client";

import type { MouseEvent, PointerEvent, RefObject } from "react";
import type { CalculationResult } from "../../../domain/calculation/types";
import type {
  WorksheetDocument,
  WorksheetRegion,
  Point,
} from "../../../domain/worksheet/model";
import type { MathEditorHandle } from "../../editor/math/editor-port";
import { WorksheetRegionView } from "../../regions/worksheet-region";

type Props = {
  document: WorksheetDocument;
  calculation: CalculationResult;
  activeRegionId: string | null;
  canvasRef: RefObject<HTMLElement | null>;
  dragPosition?: Point;
  dragRegionId?: string;
  onPaperClick(event: MouseEvent<HTMLElement>): void;
  onActivate(regionId: string): void;
  onRegionFocusLeave(regionId: string): void;
  onDelete(regionId: string): void;
  onReplace(region: WorksheetRegion): void;
  onDragStart(
    event: PointerEvent<HTMLButtonElement>,
    region: WorksheetRegion,
  ): void;
  onMathEditorReady(regionId: string, handle: MathEditorHandle | null): void;
  onRequestText(region: WorksheetRegion): void;
  onRequestMath(region: WorksheetRegion): void;
};

export function WorksheetCanvas({
  document,
  calculation,
  activeRegionId,
  canvasRef,
  dragPosition,
  dragRegionId,
  onPaperClick,
  onActivate,
  onRegionFocusLeave,
  onDelete,
  onReplace,
  onDragStart,
  onMathEditorReady,
  onRequestText,
  onRequestMath,
}: Props) {
  return (
    <section className="editor-scroll" aria-label="Worksheet canvas">
      <article
        className="worksheet-page"
        aria-label="Squared worksheet paper"
        ref={canvasRef}
        onClick={onPaperClick}
      >
        {document.regions.map((region, index) => {
          const result =
            region.type === "math" ? calculation.regions[region.id] : undefined;
          return (
            <WorksheetRegionView
              key={region.id}
              region={region}
              index={index}
              active={activeRegionId === region.id}
              result={result}
              error={result?.status === "error" ? result.message : undefined}
              onActivate={() => onActivate(region.id)}
              onDelete={() => onDelete(region.id)}
              onReplace={onReplace}
              onDragStart={(event) => onDragStart(event, region)}
              onMathEditorReady={(handle) =>
                onMathEditorReady(region.id, handle)
              }
              onRequestText={() => onRequestText(region)}
              onRequestMath={() => onRequestMath(region)}
              position={dragRegionId === region.id ? dragPosition : undefined}
              onFocusLeave={() => onRegionFocusLeave(region.id)}
            />
          );
        })}
      </article>
    </section>
  );
}
