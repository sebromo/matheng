"use client";

import { memo } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import type { RegionCalculationResult } from "../../domain/calculation/types";
import type { MathStatement } from "../../domain/expressions/ast";
import type { Point, WorksheetRegion } from "../../domain/worksheet/model";
import type { MathEditorHandle } from "../editor/math/editor-port";
import { MathLiveEditor } from "../editor/math/mathlive-editor";
import { formatCalculationResult } from "./format-result";
import type {
  PointerEvent as ReactPointerEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";

export type WorksheetRegionProps = {
  region: WorksheetRegion;
  index: number;
  active: boolean;
  result?: RegionCalculationResult;
  error?: string;
  onActivate(): void;
  onFocusLeave(): void;
  onDelete(): void;
  onReplace(region: WorksheetRegion): void;
  onDragStart(event: ReactPointerEvent<HTMLButtonElement>): void;
  onMathEditorReady(handle: MathEditorHandle | null): void;
  onRequestText(): void;
  onRequestMath(): void;
  position?: Point;
};

export const WorksheetRegionView = memo(function WorksheetRegionView({
  region,
  index,
  active,
  onFocusLeave,
  result,
  error,
  onActivate,
  onDelete,
  onReplace,
  onDragStart,
  onMathEditorReady,
  onRequestText,
  onRequestMath,
  position,
}: WorksheetRegionProps) {
  const className = `worksheet-region ${region.type}-region ${active ? "active" : ""} ${error ? "has-error" : ""} ${region.type === "text" && region.presentation?.role === "heading" ? "heading-region" : ""}`;

  function updateMath(expression: MathStatement["expression"]) {
    if (region.type !== "math") return;
    const content: MathStatement =
      region.content.kind === "assignment"
        ? { ...region.content, expression }
        : { kind: "expression", expression };
    onReplace({ ...region, content });
  }

  function updateDefinition(name: string) {
    if (region.type !== "math") return;
    const expression = region.content.expression;
    const content: MathStatement = name.trim()
      ? { kind: "assignment", name: name.trim(), expression }
      : { kind: "expression", expression };
    onReplace({ ...region, content });
  }

  function updateAssignment(
    name: string,
    expression: MathStatement["expression"],
  ) {
    if (region.type !== "math") return;
    onReplace({
      ...region,
      content: { kind: "assignment", name, expression },
    });
  }

  return (
    <div
      className={className}
      style={{
        left: `${((position ?? region.position).x / 210) * 100}%`,
        top: `${((position ?? region.position).y / 297) * 100}%`,
        zIndex: region.zIndex,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          nextTarget instanceof Node &&
          event.currentTarget.contains(nextTarget)
        )
          return;
        onFocusLeave();
      }}
    >
      <button
        className="region-grip"
        type="button"
        title="Move region"
        aria-label={`Move region ${index + 1}`}
        onPointerDown={onDragStart}
        onClick={(event) => event.stopPropagation()}
      >
        <GripVertical size={12} aria-hidden="true" />
      </button>
      {region.type === "math" ? (
        <>
          {region.content.kind === "assignment" && (
            <label className="definition-input has-definition">
              <span className="visually-hidden">Variable name</span>
              <input
                aria-label={`Variable definition ${index + 1}`}
                value={region.content.name}
                size={Math.max(1, region.content.name.length)}
                onChange={(event) => updateDefinition(event.target.value)}
              />
              <span className="definition-operator" aria-hidden="true">
                :=
              </span>
            </label>
          )}
          <MathLiveEditor
            expression={region.content.expression}
            deferBareIdentifier={region.content.kind !== "assignment"}
            onChange={updateMath}
            onAssignment={updateAssignment}
            onFocus={onActivate}
            onRequestText={onRequestText}
            onReady={onMathEditorReady}
          />
          {result?.status === "success" && (
            <>
              <span className="equals-sign">=</span>
              <output className="inline-result">
                {formatCalculationResult(result.value)}
              </output>
            </>
          )}
          {result?.status === "error" && (
            <span className="inline-error" role="status">
              {result.message}
            </span>
          )}
        </>
      ) : (
        <textarea
          aria-label={`Text region ${index + 1}`}
          className="text-input"
          value={region.content}
          onChange={(event) =>
            onReplace({ ...region, content: event.target.value })
          }
          onKeyDown={(event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
            if ((event.ctrlKey || event.metaKey) && event.code === "Space") {
              event.preventDefault();
              onRequestMath();
            } else if (event.code === "Space" && !region.content) {
              event.preventDefault();
              onRequestMath();
            }
          }}
          placeholder="Type text..."
          rows={Math.max(1, Math.min(5, region.content.split("\n").length))}
        />
      )}
      <button
        className="delete-region"
        type="button"
        title="Delete region"
        aria-label={`Delete region ${index + 1}`}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
});
