# ADR 0003: MathLive Behind an Internal Adapter

## Context

The required experience is direct editing of nested mathematical structures, not a LaTeX text field.

## Decision

Use MathLive 0.111.4 (MIT), isolated behind `MathEditorAdapter`. MathLive supplies in-place editing, navigation, shortcuts, fraction/root/script structures, selection, and virtual keyboard. Forma converts supported AsciiMath output to its own AST and persists that AST.

## Alternatives considered

Rendering-only libraries, a plain text/LaTeX editor, and a custom DOM-based structured editor. Rendering-only does not satisfy direct editing; a complete custom editor is too large to build safely in this phase.

## Consequences

Students do not need to type LaTeX. Vendor APIs and serialization do not enter the worksheet model. Licensing is MIT.

## Known limitations

Only the Forma numeric grammar is accepted by the adapter. Matrix/vector input, full MathJSON extraction, and complete SMath-like region/cursor workflows require further work. Rendering/editor behavior must be covered by browser regression tests.
