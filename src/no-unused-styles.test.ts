import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import { test } from "node:test";
import rule from "./no-unused-styles.js";

// Configure the rule tester for Node.js test runner
RuleTester.afterAll = (cb: () => void) => {
  // Node.js test runner doesn't need afterAll cleanup
  if (cb) cb();
};

RuleTester.describe = (name: string, fn: () => void) => {
  // Node.js test runner uses test() instead of describe()
  fn();
};

RuleTester.it = (name: string, fn: () => void) => {
  // Node.js test runner uses test() instead of it()
  fn();
};

// Initialize a new rule tester with TypeScript ESLint
const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

// Test cases
const validCases = [
  // Case 1: All styles are used
  {
    code: `
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
    `,
  },
  // Case 2: Exported stylesheet should be ignored even if styles are unused
  {
    code: `
      import { css } from "react-strict-dom";
      export const styles = css.create({
        container: {
          flex: 1,
        },
        text: {
          color: "red",
        },
      });
    `,
  },
  // Case 3: Exported stylesheet via separate export statement
  {
    code: `
      import { css } from "react-strict-dom";
      const styles = css.create({
        container: {
          flex: 1,
        },
        text: {
          color: "red",
        },
      });
      
      export { styles };
    `,
  },
  // Case 4: Exported stylesheet via default export
  {
    code: `
      import { css } from "react-strict-dom";
      const styles = css.create({
        container: {
          flex: 1,
        },
        text: {
          color: "red",
        },
      });
      
      export default styles;
    `,
  },
  // Case 5: Exported stylesheet with TypeScript satisfies
  {
    code: `
      import { css } from "react-strict-dom";
      type StyleType = { container: { flex: number }; text: { color: string } };
      export const styles = css.create({
        container: {
          flex: 1,
        },
        text: {
          color: "red",
        },
      }) satisfies StyleType;
    `,
  },
  // Case 6: Used styles with TypeScript satisfies
  {
    code: `
      import { css } from "react-strict-dom";
      type StyleType = { container: { flex: number }; text: { color: string } };
      const styles = css.create({
        container: {
          flex: 1,
        },
        text: {
          color: "red",
        },
      }) satisfies StyleType;
      
      function Component() {
        return (
          <div style={styles.container}>
            <span style={styles.text}>Hello</span>
          </div>
        );
      }
    `,
  },
];

const invalidCases = [
  // Case 1: Unused style in non-exported stylesheet
  {
    code: `
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
            <span>Hello</span>
          </div>
        );
      }
    `,
    errors: [
      {
        messageId: "unusedStyle" as const,
        data: { styleSheetName: "styles", styleName: "text" },
        type: AST_NODE_TYPES.Property,
      },
    ],
    output: `
      import { css } from "react-strict-dom";
      const styles = css.create({
        container: {
          flex: 1,
        },
      });
      
      function Component() {
        return (
          <div style={styles.container}>
            <span>Hello</span>
          </div>
        );
      }
    `,
  },
  // Case 2: All styles unused in non-exported stylesheet (should remove entire stylesheet)
  {
    code: `
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
          <div>
            <span>Hello</span>
          </div>
        );
      }
    `,
    errors: [
      {
        messageId: "unusedStyleSheet" as const,
        data: { styleSheetName: "styles" },
        type: AST_NODE_TYPES.VariableDeclaration,
      },
    ],
    output: `
      import { css } from "react-strict-dom";
      
      
      function Component() {
        return (
          <div>
            <span>Hello</span>
          </div>
        );
      }
    `,
  },
  // Case 3: Multiple stylesheets with one completely unused
  {
    code: `
      import { css } from "react-strict-dom";
      const styles1 = css.create({
        container: {
          flex: 1,
        },
      });
      
      const styles2 = css.create({
        text: {
          color: "red",
        },
      });
      
      function Component() {
        return (
          <div style={styles1.container}>
            <span>Hello</span>
          </div>
        );
      }
    `,
    errors: [
      {
        messageId: "unusedStyleSheet" as const, 
        data: { styleSheetName: "styles2" },
        type: AST_NODE_TYPES.VariableDeclaration,
      },
    ],
    output: `
      import { css } from "react-strict-dom";
      const styles1 = css.create({
        container: {
          flex: 1,
        },
      });
      
      
      
      function Component() {
        return (
          <div style={styles1.container}>
            <span>Hello</span>
          </div>
        );
      }
    `,
  },
  // Case 4: Unused style with TypeScript satisfies
  {
    code: `
      import { css } from "react-strict-dom";
      type StyleType = { container: { flex: number }; text: { color: string } };
      const styles = css.create({
        container: {
          flex: 1,
        },
        text: {
          color: "red",
        },
      }) satisfies StyleType;
      
      function Component() {
        return (
          <div style={styles.container}>
            <span>Hello</span>
          </div>
        );
      }
    `,
    errors: [
      {
        messageId: "unusedStyle" as const,
        data: { styleSheetName: "styles", styleName: "text" },
        type: AST_NODE_TYPES.Property,
      },
    ],
    output: `
      import { css } from "react-strict-dom";
      type StyleType = { container: { flex: number }; text: { color: string } };
      const styles = css.create({
        container: {
          flex: 1,
        },
      }) satisfies StyleType;
      
      function Component() {
        return (
          <div style={styles.container}>
            <span>Hello</span>
          </div>
        );
      }
    `,
  },
];

// Run the tests
test("ESLint rule: no-unused-styles", () => {
  validCases.forEach((testCase, index) => {
    try {
      ruleTester.run("no-unused-styles", rule, {
        valid: [testCase],
        invalid: [],
      });
      console.log(`✅ Valid test case ${index + 1} passed`);
    } catch (error) {
      console.error(`❌ Valid test case ${index + 1} failed:`, error);
      throw error;
    }
  });

  invalidCases.forEach((testCase, index) => {
    try {
      ruleTester.run("no-unused-styles", rule, {
        valid: [],
        invalid: [testCase],
      });
      console.log(`✅ Invalid test case ${index + 1} passed`);
    } catch (error) {
      console.error(`❌ Invalid test case ${index + 1} failed:`, error);
      throw error;
    }
  });

  console.log("All tests passed!");
});
