"use client";

import { useEffect, useRef, useState } from "react";
import type { MathExpression } from "../../../domain/expressions/ast";
import type { MathEditorHandle } from "./editor-port";
import { MathLiveAdapter } from "./mathlive-adapter";

const adapter = new MathLiveAdapter();

type Props = {
  expression: MathExpression;
  onChange(expression: MathExpression): void;
  onFocus(): void;
  onRequestText(): void;
  onReady(handle: MathEditorHandle | null): void;
};

export function MathLiveEditor({
  expression,
  onChange,
  onFocus,
  onRequestText,
  onReady,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const currentCallbacks = useRef({
    onChange,
    onFocus,
    onRequestText,
    onReady,
  });
  const currentExpression = useRef(expression);
  const initialExpression = useRef(expression);
  const lastEmitted = useRef("");
  const [error, setError] = useState("");
  const serializedExpression = JSON.stringify(expression);

  currentCallbacks.current = { onChange, onFocus, onRequestText, onReady };
  currentExpression.current = expression;

  useEffect(() => {
    if (!host.current) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;

    void adapter
      .mount(host.current, initialExpression.current, {
        onExpression(next) {
          if (cancelled) return;
          lastEmitted.current = JSON.stringify(next);
          setError("");
          currentCallbacks.current.onChange(next);
        },
        onInvalid(message) {
          if (!cancelled) setError(message);
        },
        onFocus() {
          if (cancelled) return;
          currentCallbacks.current.onFocus();
        },
        onRequestText() {
          if (cancelled) return;
          currentCallbacks.current.onRequestText();
        },
        onReady(handle) {
          if (cancelled) return;
          currentCallbacks.current.onReady(handle);
        },
      })
      .then((cleanup) => {
        if (cancelled) cleanup();
        else {
          dispose = cleanup;
          const field = host.current?.firstElementChild as
            (HTMLElement & { value: string }) | null;
          const latestExpression = currentExpression.current;
          const latestSerializedExpression = JSON.stringify(latestExpression);
          if (field && lastEmitted.current !== latestSerializedExpression) {
            field.value = adapter.expressionToEditorValue(latestExpression);
            lastEmitted.current = latestSerializedExpression;
          }
        }
      });

    return () => {
      cancelled = true;
      currentCallbacks.current.onReady(null);
      dispose?.();
    };
  }, []);

  useEffect(() => {
    if (
      !host.current ||
      !host.current.firstElementChild ||
      lastEmitted.current === serializedExpression
    )
      return;
    const field = host.current.firstElementChild as HTMLElement & {
      value: string;
    };
    field.value = adapter.expressionToEditorValue(expression);
    lastEmitted.current = serializedExpression;
  }, [expression, serializedExpression]);

  return (
    <div className="math-editor-shell">
      <div
        className="mathlive-host"
        ref={host}
        aria-label="Mathematical expression editor"
      />
      {error && (
        <span className="inline-error" role="status">
          {error}
        </span>
      )}
    </div>
  );
}
