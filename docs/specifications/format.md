---
title: Spec Format
categories:
  - spec
---

# Feature Specification

Feature specifications for mndsite. Each spec defines the purpose, requirements,
and named test cases for a feature area.

## Development Process

1. Write a spec here in `docs/specifications/<feature>.md`
2. Implement the test cases in `tests/` (tests first — they should fail initially)
3. Implement the feature until all tests pass
4. The spec page appears in the site automatically after running ingest

## Markdown Format

```markdown
---
title: Feature Name
categories:
  - spec
---

# Feature Name

One-paragraph description of purpose.

## Requirements

1. REQ-1: Description
2. REQ-2: Description

## Test Cases

- `test_<function>_<case>` — what it verifies (maps to REQ-N)
```

## Current Specs

- [Ingest Pipeline](pipeline/ingest-pipeline) — content mirroring and renderer metadata
- [Metadata Contract](metadata) — the per-page metadata record and frontmatter sources
- [Navtree Naming](navtree-naming) — how page and directory labels are derived for navigation
- [Page Metadata](page-metadata) — date, reading time, category and tag chips
- [Site Configuration](site-configuration) — all `mndsite.yaml` fields and their effects
- [Directory Feed](pipeline/dir-feed) — removed; organization moved to mndmap

## Pipeline context

Specs assume publication-ready input from **mndmap** (or equivalent manual content). Cross-project contract tests live in `tests/build/mndmap-fixture.test.js` and `tests/fixtures/mndmap-destination/`.
