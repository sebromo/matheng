# Worksheet Document Model

The authoritative document is a versioned JSON object validated with Zod. Version 1 contains an ID, title, page/grid settings, and a discriminated math/text region list. Region IDs are stable; calculation results, selection, cursor, drag state, and zoom are not serialized.

Coordinates use millimeters on a configurable page. The current default is A4 (210 × 297 mm). The renderer maps document coordinates into CSS percentages; browser pixels are never persisted. Region `zIndex` orders overlaps, and overlap is allowed. Regions currently size to content; the optional size field is reserved for explicit sizing. The current page is finite and clipped; infinite canvas and multiple pages are deferred.

Serialization is JSON and independent of React/PostgreSQL. Runtime validation limits the serialized payload to 2 MB, 2,000 regions, 20,000 characters per text region, coordinate/page bounds, and expression nesting depth. The legacy prototype's percentage coordinates migrate to millimeters and its math text is parsed into AST nodes.

`serializeWorksheet` and `deserializeWorksheet` are covered by round-trip, validation, size-limit, depth-limit, and legacy migration tests. New schema versions require explicit migrations; only the prototype-to-v1 migration exists today.
