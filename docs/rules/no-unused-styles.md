# no-unused-styles

Detects unused styles created with `css.create` from react-strict-dom.

## Rule Details

This rule helps you identify styles that are defined in `css.create()` calls but are never actually used in your React components. It also provides automatic fixes to remove these unused styles.

❌ Examples of **incorrect** code for this rule:

```jsx
import { css } from "react-strict-dom";

const styles = css.create({
  container: {
    flex: 1,
  },
  unused: {  // ❌ This style is never used
    color: "red",
  },
});

function Component() {
  return <div style={styles.container}>Hello</div>;
}
```

✅ Examples of **correct** code for this rule:

```jsx
import { css } from "react-strict-dom";

const styles = css.create({
  container: {
    flex: 1,
  },
  text: {
    color: "red",
  },
});

function Component() {
  return (
    <div style={styles.container}>
      <span style={styles.text}>Hello</span>
    </div>
  );
}
```

```jsx
import { css } from "react-strict-dom";

// Exported stylesheets are ignored (they might be used elsewhere)
export const styles = css.create({
  container: {
    flex: 1,
  },
  unused: {  // ✅ Allowed because the stylesheet is exported
    color: "red",
  },
});
```

## Options

This rule has no options.

## When Not To Use It

You might want to disable this rule if:

- You have styles that are conditionally used based on complex logic that the rule can't detect
- You're building a library and want to export all styles regardless of internal usage
- You prefer to manually manage style cleanup

## Auto-fixing

This rule provides automatic fixes that will:

1. Remove individual unused styles from `css.create()` calls
2. Remove entire `css.create()` variable declarations if all styles are unused
3. Handle proper comma placement when removing styles from objects

The fixer is smart enough to:

- Preserve the last style in an object (to avoid invalid syntax)
- Handle both regular variable declarations and TypeScript assertions (`satisfies`)
- Skip exported stylesheets (as they might be used in other modules)
