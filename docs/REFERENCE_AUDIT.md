# Reference audit

Date: 2026-08-14

## Workspace result

The initial workspace contained only:

- `AGENTS.md`;
- `CODEX_MASTER_PROMPT_PRODUCTIVITY_APP.md`;
- `icon.png`.

No `archsyrup-main.zip`, extracted legacy directory, `.reference/` tree, README, package manifest, source tree, environment file or Git history was present. There was therefore no legacy code, SQL, exercise catalog, test suite or authorized workout GIF set to inspect or reuse in Phase 0.

## Reuse decisions

The provided `icon.png` is the only reusable project asset. It is a 1536×1536 monochrome geometric fox on a black rounded square. It defines the project identity through:

- an ink/ivory core palette;
- crisp diagonal cuts used sparingly as an accent motif;
- strong silhouette at small sizes;
- a precise, quiet visual character rather than decorative illustration.

The source was preserved unchanged as `public/icons/app-icon.png`. A non-destructive transparent extraction produced with the built-in image generation/editing tool is stored as `public/icons/brand-mark.png` for use on dark brand surfaces.

Final image-edit prompt:

> Extract the complete geometric fox head and crossed lower-tail/scarf emblem onto a genuinely transparent background; change only the rounded black app-icon background; preserve geometry, proportions, eyes, nose, line weights, white fill and black internal details; no text or added elements.

## Deferred legacy audit

If the reference project is supplied later, place it under `.reference/archsyrup-main/` and audit only the paths named in `AGENTS.md`. Before importing anything:

1. scan for `.env`, keys, tokens and remote URLs;
2. confirm ownership and migration rights for workout GIFs;
3. compare habits, workout and calendar algorithms with the new normalized contracts;
4. port logic and tests to strict TypeScript;
5. keep all legacy CSS, tokens and navigation out of the new design system.

The implementation plan keeps the catalog/GIF import work blocked on receiving that source. The product foundation does not depend on it.

## Risks

- The exercise catalog and useful legacy test cases cannot yet be evaluated.
- Rights and permanence of any legacy hosted GIF URLs remain unknown.
- The transparent extraction is raster, not a true SVG source. It is suitable for the PWA and UI; a manually traced vector can be added later without changing the current identity tokens.
- The product name is Foxsit, confirmed during the 2026-08-18 product-polish pass and centralized in `src/config/product.ts`.
