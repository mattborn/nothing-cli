# nothing-refactor

## Goal

Create a Node.js script that standardizes all projects using the `nothing-static` build system.

## Requirements

1. **Find all projects** with a `build.js` file across `~/Code/code-2025`
2. **Compare each project's build system** to the standardized `nothing-static` build system
3. **Refactor each project** to use the new standard while preserving:
   - All existing content and features
   - Project-specific customizations
   - Git history
4. **Rewrite git history** so the latest `nothing-static` commit becomes the first commit in each repo
5. **Preserve all other commits** after that initial standardization commit

## Current Standard: nothing-static

The standardized build system includes:
- **build.js** (76 lines, DRY, minimal)
- **src/layout.html** with `<base href="{base}">` tag
- **package.json** with build/dev/watch scripts
- **Pattern**: `page.html` → `index.html`, `name.html` → `name/index.html`
- **Pattern**: `app/page.html` → `app/index.html`
- **Global assets**: `global.css` and `global.js` on every page
- **Conditional page-specific assets**: Auto-detects `pagename.css` and `pagename.js`
- **Base path switching**: `--dev` flag for local vs production paths

## Workflow

```
For each project with build.js:
  1. Analyze current build system
  2. Identify project-specific features/customizations
  3. Generate migration plan
  4. Refactor to nothing-static standard
  5. Preserve custom features
  6. Rewrite git history
  7. Validate build output matches original
```

## Projects to Standardize

All projects in `~/Code/code-2025/**/build.js` (17 found previously)
