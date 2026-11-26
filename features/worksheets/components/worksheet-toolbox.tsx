"use client";

import { useEffect, useRef, useState } from "react";
import { FunctionSquare, Keyboard, Menu, Type } from "lucide-react";
import type { MathMenuItem } from "../../editor/math/editor-port";

type Props = {
  onAddRegion(type: "math" | "text"): void;
  menuItems: readonly MathMenuItem[];
  onSelectMenuItem(item: MathMenuItem): void;
  onOpenMathMenu(): void;
};

type MenuModifiers = {
  alt: boolean;
  control: boolean;
  shift: boolean;
  meta: boolean;
};

type MenuDescriptor = {
  type?: string;
  id?: string;
  label?: string | ((modifiers: MenuModifiers) => string);
  ariaLabel?: string | ((modifiers: MenuModifiers) => string);
  tooltip?: string | ((modifiers: MenuModifiers) => string);
  visible?: boolean | ((modifiers: MenuModifiers) => boolean);
  enabled?: boolean | ((modifiers: MenuModifiers) => boolean);
  checked?:
    boolean | "mixed" | ((modifiers: MenuModifiers) => boolean | "mixed");
  keyboardShortcut?: string;
  columnCount?: number;
  submenu?: readonly MathMenuItem[];
  onMenuSelect?: unknown;
};

const noModifiers: MenuModifiers = {
  alt: false,
  control: false,
  shift: false,
  meta: false,
};

export function WorksheetToolbox({
  onAddRegion,
  menuItems,
  onSelectMenuItem,
  onOpenMathMenu,
}: Props) {
  const keyboardHost = useRef<HTMLDivElement>(null);
  const menuPanel = useRef<HTMLElement>(null);
  const [keyboard, setKeyboard] = useState<Window["mathVirtualKeyboard"]>();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let activeKeyboard: Window["mathVirtualKeyboard"] | undefined;
    const updateVisibility = () =>
      setKeyboardVisible(activeKeyboard?.visible ?? false);

    void import("mathlive").then(() => {
      if (cancelled || !keyboardHost.current) return;
      activeKeyboard = window.mathVirtualKeyboard;
      activeKeyboard.container = keyboardHost.current;
      activeKeyboard.layouts = ["numeric", "symbols", "greek", "alphabetic"];
      activeKeyboard.editToolbar = "none";
      activeKeyboard.addEventListener(
        "virtual-keyboard-toggle",
        updateVisibility,
      );
      setKeyboard(activeKeyboard);
      activeKeyboard.show();
      updateVisibility();
    });

    return () => {
      cancelled = true;
      if (!activeKeyboard) return;
      activeKeyboard.removeEventListener(
        "virtual-keyboard-toggle",
        updateVisibility,
      );
      activeKeyboard.hide();
      activeKeyboard.container = document.body;
    };
  }, []);

  function toggleKeyboard() {
    if (keyboard?.visible) keyboard.hide();
    else keyboard?.show();
  }

  return (
    <aside className="toolbox" aria-label="Math toolbox">
      <div className="toolbox-heading">WORKSHEET TOOLS</div>
      <div className="region-actions">
        <button
          type="button"
          className="region-tool"
          onClick={() => onAddRegion("math")}
        >
          <FunctionSquare size={15} /> Math region
        </button>
        <button
          type="button"
          className="region-tool"
          onClick={() => onAddRegion("text")}
        >
          <Type size={15} /> Text region
        </button>
        <button
          type="button"
          className="region-tool"
          aria-label="Toggle virtual keyboard"
          aria-pressed={keyboardVisible}
          disabled={!keyboard}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleKeyboard}
        >
          <Keyboard size={15} /> Virtual keyboard
        </button>
        <button
          type="button"
          className="region-tool"
          aria-label="Math editing menu"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onOpenMathMenu();
            menuPanel.current?.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          }}
        >
          <Menu size={15} /> Math menu
        </button>
      </div>
      <div
        className="math-keyboard-host"
        aria-label="MathLive virtual keyboard"
        ref={keyboardHost}
      />
      <section
        className="math-menu-panel"
        id="math-editing-menu"
        aria-label="Math editing menu"
        ref={menuPanel}
      >
        <h2>Math editing</h2>
        {menuItems.length > 0 ? (
          menuItems.map((item, index) =>
            renderMenuItem(item, index, onSelectMenuItem),
          )
        ) : (
          <p>Math editing options will be available when the editor loads.</p>
        )}
      </section>
    </aside>
  );
}

function renderMenuItem(
  item: MathMenuItem,
  index: number,
  onSelectMenuItem: (item: MathMenuItem) => void,
): React.ReactNode {
  const descriptor = item as unknown as MenuDescriptor;
  const key = descriptor.id ?? `menu-item-${index}`;
  const label = menuLabel(descriptor);

  if (descriptor.type === "divider")
    return <div className="math-menu-divider" key={key} role="separator" />;

  if (descriptor.type === "heading")
    return (
      <h3 className="math-menu-heading" key={key}>
        {label}
      </h3>
    );

  if (descriptor.submenu) {
    const columns = descriptor.columnCount;
    return (
      <section className="math-menu-group" key={key}>
        <h3>{label}</h3>
        <div
          className={`math-menu-items ${columns && columns > 1 ? "grid" : ""}`}
          style={
            columns
              ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
              : undefined
          }
        >
          {descriptor.submenu.map((child, childIndex) =>
            renderMenuItem(child, childIndex, onSelectMenuItem),
          )}
        </div>
      </section>
    );
  }

  const visible = resolveValue(descriptor.visible) ?? true;
  const enabled = resolveValue(descriptor.enabled) ?? true;
  const checked = resolveValue(descriptor.checked);
  const title = resolveValue(descriptor.tooltip);
  const hasHandler = typeof descriptor.onMenuSelect === "function";

  return (
    <button
      className="math-menu-item"
      key={key}
      type="button"
      title={typeof title === "string" ? plainMenuText(title) : undefined}
      aria-label={label}
      aria-pressed={checked === true}
      disabled={!visible || !enabled || !hasHandler}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelectMenuItem(item)}
    >
      <span>{label}</span>
      {descriptor.keyboardShortcut && (
        <kbd>
          {descriptor.keyboardShortcut.replaceAll("[", "").replaceAll("]", "")}
        </kbd>
      )}
    </button>
  );
}

function resolveValue<T>(
  value: T | ((modifiers: MenuModifiers) => T) | undefined,
): T | undefined {
  return typeof value === "function"
    ? (value as (modifiers: MenuModifiers) => T)(noModifiers)
    : value;
}

function menuLabel(item: MenuDescriptor): string {
  const matrixDimensions = item.id?.match(/^insert-matrix-(\d+)x(\d+)$/);
  if (matrixDimensions)
    return `${matrixDimensions[1]} x ${matrixDimensions[2]}`;
  const label =
    resolveValue(item.ariaLabel) ?? resolveValue(item.label) ?? item.id ?? "";
  return plainMenuText(label);
}

function plainMenuText(markup: string): string {
  if (typeof DOMParser === "undefined") return markup.replace(/<[^>]*>/g, "");
  return (
    new DOMParser()
      .parseFromString(markup, "text/html")
      .body.textContent?.trim() ?? ""
  );
}
