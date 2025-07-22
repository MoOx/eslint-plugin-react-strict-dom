# Copilot Instructions

## Project Overview

This is an ESLint plugin specifically designed for **react-strict-dom**, focusing on detecting unused CSS styles created with `css.create()`. The plugin provides auto-fixes to remove unused styles and entire stylesheets.

## Code Style & Patterns

- Use English for all code, comments, and docs
- **Never use `any`** - use explicit `TSESTree.*` types from `@typescript-eslint/utils`
- Prefer `type` over `interface`, inline types over separate declarations
- Comments explain **why**, stay concise
- Keep functions short, single-purpose with early returns
- Use immutability (`readonly`, `as const`)

## Architecture & Key Components

### Source-to-Build Pipeline

- **Source**: TypeScript files in `src/` (using `@typescript-eslint/utils`)
- **Build**: Transpiled to JavaScript in `rules/` via `npm run build` (tsc)
- **Entry**: `index.js` exports plugin with rules and recommended config

### Core ESLint Rule Structure

- Use `ESLintUtils.RuleCreator` from `@typescript-eslint/utils` (not native ESLint)
- AST analysis uses explicit `TSESTree.*` types (no type aliases)
- Rules follow pattern: collect nodes → track usage → report unused

### React Strict DOM Pattern Detection

The rule specifically tracks:

```javascript
import { css } from "react-strict-dom";
const styles = css.create({ ... }); // Tracked stylesheet
<div style={styles.container} />    // Usage tracking
```

## Critical Implementation Patterns

### TypeScript ESLint Integration

- Import from `@typescript-eslint/utils`, not `@eslint/js`
- Handle TypeScript expressions: `TSAsExpression`, `TSSatisfiesExpression`

### AST Node Pattern Matching

```typescript
// CSS.create detection
node.type === "CallExpression" &&
  node.callee.type === "MemberExpression" &&
  node.callee.object.name === "css" &&
  node.callee.property.name === "create";

// Style usage detection
node.type === "MemberExpression" &&
  node.object.type === "Identifier" &&
  node.property.type === "Identifier";
```

### Export Handling

- Track direct exports: `export const styles = css.create(...)`
- Track named exports: `export { styles }`
- Exported stylesheets are excluded from unused reporting

### Auto-fix Strategy

- Remove individual unused properties with comma handling
- Remove entire `css.create()` calls when all styles unused
- Handle both single and multiple variable declarators

## Testing Patterns

- Use `@typescript-eslint/rule-tester` with Node.js test runner compatibility
- Test structure: `valid` cases (no errors) + `invalid` cases (with messageId)
- All test cases use `import { css } from "react-strict-dom"` pattern

## File Structure Conventions

```
src/               # TypeScript source files
├── *.ts          # Rule implementations
└── *.test.ts     # Test files
rules/            # Generated JavaScript (git-ignored)
docs/rules/       # Markdown documentation
index.js          # Plugin entry point
```

## Dependencies & Versions

- Node.js ≥18, ESLint ≥9.0.0
- Core: `@typescript-eslint/utils` for rule creation
- Dev: `@typescript-eslint/rule-tester` for testing
- No React runtime dependency (analyzes code statically)

## Rule Documentation Pattern

Each rule needs corresponding `docs/rules/{rule-name}.md` with:

- Rule description and examples
- ❌ Incorrect code examples
- ✅ Correct code examples
- Links referenced in `createRule()` URLs
