# ADR 0007: Initial SI Quantity Boundary

## Context

Engineering calculations need typed quantities, dimensional checks, conversion, and distinct absolute/relative temperature semantics. Full unit coverage is not part of this iteration.

## Decision

Implement a small framework-independent SI subset in `domain/units`, with explicit dimension vectors, affine temperature kinds, conversion operations, and tests. Store physical constants as sourced, versioned data. Do not feed unit strings or arbitrary expressions to a general-purpose evaluator.

## Alternatives considered

- Math.js 15.3.0 (Apache-2.0) has bundled TypeScript types and unit arithmetic but also provides a broad expression/evaluation model that would need a strict adapter to preserve Forma's grammar.
- `js-quantities` 1.8.0 (MIT) is quantity-focused but has no `types`/`typings` field in npm metadata.
- `convert-units` 2.3.4 (MIT) handles conversions but not dimensional algebra.

## Consequences

The implemented SI surface is small, explicit, and independently testable. It avoids a new runtime dependency during initial AST integration.

## Known limitations

Units are not parsed from math regions or connected to calculation results. Reassess a typed quantity library when expression support is integrated; the hand-maintained registry is not intended to grow into a comprehensive unit database.
