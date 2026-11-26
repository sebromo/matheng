# Calculation Engine

The calculation package is independent of React and PostgreSQL. It parses prototype-compatible input into AST nodes, extracts identifiers, constructs region dependencies, topologically evaluates assignments independent of spatial order, identifies cycles, and returns typed region statuses/errors.

Duplicate definitions are rejected for every duplicate region; references to a duplicate are also errors. Undefined identifiers are explicit errors. Empty math regions are pending. Re-definitions are not sequential assignments. Supported results are finite real scalars; division by zero, non-finite operations, unsupported constructs, and dependency failures have structured codes.

`CalculationSession` compares math-region ASTs, rebuilds the graph, invalidates the changed node and old/new transitive dependents, and reuses unaffected results. Tests assert both expected engineering values and the recalculated region set. It is synchronous and in-process today. Timeouts, cancellation, progress, and a separate worker are deferred.

The SI quantity subsystem is separately tested, but quantities are not yet connected to AST evaluation, dependency results, or the UI. Dimensional mismatch is therefore not yet an evaluator result.
