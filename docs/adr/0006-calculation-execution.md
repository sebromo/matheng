# ADR 0006: Restricted In-Process Calculation

## Context

Basic worksheets need responsive, safe numerical calculation without allowing arbitrary code execution or introducing a remote service.

## Decision

Use a framework-independent AST evaluator with explicit grammar, dependency graph, cycle detection, structured results, and an incremental `CalculationSession`. Keep execution in-process behind a separate calculation API.

## Alternatives considered

JavaScript `eval`, sequential region evaluation, a remote calculation microservice, and a queue-backed worker.

## Consequences

Calculations are deterministic, testable, and local. The domain can later be called from a worker without coupling to UI/database modules.

## Known limitations

Current values are real scalars. Units exist as a tested independent domain subsystem but are not integrated into expression evaluation. Timeouts/cancellation/workload isolation are deferred until expensive workloads exist.
