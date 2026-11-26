# Expression Model

Forma stores supported math as a discriminated AST: numeric literals, identifiers, constants, unary/binary operations, fractions, roots, powers, subscripts, functions, and quantity nodes. Assignments are a separate statement node. The supported text parser uses an explicit allowlisted grammar; it never evaluates JavaScript.

MathLive 0.111.4 (MIT) is integrated behind `MathEditorAdapter`. It provides direct structured editing, cursor movement, fractions, scripts, symbol shortcuts, selection, and virtual keyboard capabilities. The adapter consumes MathLive AsciiMath output and converts the supported subset into Forma AST. MathLive's own serialization is not authoritative, and its LaTeX is not required from students.

The adapter deliberately rejects unsupported editor output instead of executing or persisting opaque markup. Matrices, vectors, comparisons, arbitrary function definitions, and MathLive constructs outside the current grammar do not yet have complete AST/evaluator support. Quantity AST nodes validate and render, but are not parsed from the current input grammar or evaluated by the worksheet engine.

This is a credible initial editor integration, not the complete SMath/Mathcad interaction model. Browser tests should continue to cover fraction insertion, keyboard navigation, shortcuts, and import/export as those behaviors are expanded.
