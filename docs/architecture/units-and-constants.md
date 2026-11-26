# Units and Constants

The initial `domain/units` subset models SI base dimensions, common engineering units (mm, kN, MPa, GPa, N, J, W), radians/degrees, and absolute/delta Celsius/Kelvin temperatures. Quantities store SI magnitude, a seven-axis dimension vector, temperature kind, and display unit. Operations enforce dimensional compatibility and treat absolute temperatures separately from differences.

`domain/constants` stores stable IDs, symbols, values, units, source names, and source versions. Values are data, not evaluator globals.

Library evaluation:

- Math.js 15.3.0 (Apache-2.0) includes TypeScript declarations and unit-aware arithmetic, but is a broad math/expression platform with a separate value/type model. Adopting its parser/evaluator would bypass Forma's restricted AST/grammar unless carefully wrapped.
- `js-quantities` 1.8.0 (MIT) targets quantities and conversions but does not publish a TypeScript `types`/`typings` field in npm metadata; a maintained local type boundary would be required.
- `convert-units` 2.3.4 (MIT) focuses on conversion tables and does not provide the dimensional algebra needed for engineering expression evaluation.

For this small, tested foundation, the typed SI implementation is retained rather than adding a broad evaluator or a conversion-only dependency. Re-evaluate Math.js's unit primitives or another typed quantity library when integrating quantities into expression evaluation; compare dimension behavior, affine temperatures, aliases, license, bundle/server footprint, and safe AST integration before adopting.

The current unit subsystem is not yet parsed from MathLive input, evaluated alongside worksheet variables, displayed in results, or used to validate dimensions in a full calculation graph.
