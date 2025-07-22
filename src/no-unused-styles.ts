import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/MoOx/eslint-plugin-react-strict-dom/blob/main/docs/rules/${name}.md`,
);

interface StyleSheetEntry {
  styleSheetName: string;
  property: TSESTree.Property;
}

interface StyleSheetsData {
  styleSheets: Record<string, TSESTree.Property[]>;
  unusedStylesMap: Map<string, StyleSheetEntry>;
  exportedStyleSheets: Set<string>;
  cssCreateNodes: Map<string, TSESTree.CallExpression>;
}

/**
 * Creates a new StyleSheets data structure
 */
function createStyleSheets(): StyleSheetsData {
  return {
    styleSheets: {},
    unusedStylesMap: new Map(),
    exportedStyleSheets: new Set(),
    cssCreateNodes: new Map(),
  };
}

/**
 * Adds a style sheet to our StyleSheets collection.
 */
function addStyleSheet(
  data: StyleSheetsData,
  styleSheetName: string | null,
  properties: TSESTree.Property[],
  node: TSESTree.CallExpression
): void {
  if (styleSheetName) {
    data.styleSheets[styleSheetName] = properties;
    data.cssCreateNodes.set(styleSheetName, node);
  }
}

/**
 * Marks a style sheet as exported.
 */
function markAsExported(data: StyleSheetsData, styleSheetName: string): void {
  data.exportedStyleSheets.add(styleSheetName);
}

/**
 * Checks if a style sheet is exported.
 */
function isExported(data: StyleSheetsData, styleSheetName: string): boolean {
  return data.exportedStyleSheets.has(styleSheetName);
}

/**
 * Gets the css.create node for a style sheet.
 */
function getCssCreateNode(data: StyleSheetsData, styleSheetName: string): TSESTree.CallExpression | undefined {
  return data.cssCreateNodes.get(styleSheetName);
}

/**
 * Marks a rule as used in our source code by removing it from the
 * specified style sheet rules.
 */
function markAsUsed(data: StyleSheetsData, fullyQualifiedName: string): void {
  const nameSplit = fullyQualifiedName.split(".");
  const styleSheetName = nameSplit[0];
  const styleSheetProperty = nameSplit[1];

  if (data.styleSheets[styleSheetName]) {
    // Store the unused styles before filtering them out
    const unusedStyles = data.styleSheets[styleSheetName].filter(
      (property) => property.key.type === 'Identifier' && property.key.name === styleSheetProperty
    );

    // Remove the used styles from the collection
    data.styleSheets[styleSheetName] = data.styleSheets[styleSheetName].filter(
      (property) => property.key.type !== 'Identifier' || property.key.name !== styleSheetProperty
    );

    // If we had found the style before filtering, it means it's used
    if (unusedStyles.length > 0) {
      const key = `${styleSheetName}.${styleSheetProperty}`;
      data.unusedStylesMap.delete(key);
    }
  }
}

/**
 * Prepares the unused styles map for reporting
 */
function prepareUnusedStyles(data: StyleSheetsData): void {
  // First, populate the unusedStylesMap with all styles
  Object.keys(data.styleSheets).forEach((styleSheetName) => {
    // Skip exported stylesheets
    if (isExported(data, styleSheetName)) {
      return;
    }

    const styles = data.styleSheets[styleSheetName];
    styles.forEach((property) => {
      if (property.key.type === 'Identifier') {
        const key = `${styleSheetName}.${property.key.name}`;
        data.unusedStylesMap.set(key, { styleSheetName, property });
      }
    });
  });
}

/**
 * Returns all collected style sheets and their
 * unmarked rules.
 */
function getUnusedReferences(data: StyleSheetsData): Record<string, TSESTree.Property[]> {
  // Filter out exported stylesheets from the unused references
  const unusedReferences: Record<string, TSESTree.Property[]> = {};

  Object.keys(data.styleSheets).forEach((styleSheetName) => {
    if (!isExported(data, styleSheetName)) {
      unusedReferences[styleSheetName] = data.styleSheets[styleSheetName];
    }
  });

  return unusedReferences;
}

/**
 * Returns the map of unused styles with their nodes
 */
function getUnusedStylesMap(data: StyleSheetsData): Map<string, StyleSheetEntry> {
  return data.unusedStylesMap;
}

const astHelpers = {
  /**
   * Checks if the node contains a call to css.create
   */
  isCssCreateCall(node: TSESTree.Node): node is TSESTree.CallExpression {
    return Boolean(
      node &&
        node.type === "CallExpression" &&
        'callee' in node &&
        node.callee &&
        node.callee.type === "MemberExpression" &&
        'object' in node.callee &&
        node.callee.object &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === "css" &&
        'property' in node.callee &&
        node.callee.property &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === "create"
    );
  },

  /**
   * Gets the style sheet name from the node.
   */
  getStyleSheetName(node: TSESTree.CallExpression): string | null {
    if (node.parent) {
      // Handle regular variable declaration: const name = css.create(...)
      if (node.parent.type === 'VariableDeclarator' && 'id' in node.parent && node.parent.id && node.parent.id.type === 'Identifier') {
        return (node.parent.id as TSESTree.Identifier).name;
      }

      // Handle TypeScript expressions (TSAsExpression, TSSatisfiesExpression)
      if (
        node.parent.type === "TSAsExpression" ||
        node.parent.type === "TSSatisfiesExpression"
      ) {
        const tsExpression = node.parent;
        const grandparent = tsExpression.parent;
        if (grandparent && grandparent.type === 'VariableDeclarator' && 'id' in grandparent && grandparent.id && grandparent.id.type === 'Identifier') {
          return (grandparent.id as TSESTree.Identifier).name;
        }
      }
    }
    return null;
  },

  /**
   * Gets the style declarations from the node.
   */
  getStyleDeclarations(node: TSESTree.CallExpression): TSESTree.Property[] {
    if (
      node &&
      node.type === "CallExpression" &&
      'arguments' in node &&
      node.arguments &&
      node.arguments[0] &&
      node.arguments[0].type === 'ObjectExpression' &&
      'properties' in node.arguments[0] &&
      node.arguments[0].properties
    ) {
      return node.arguments[0].properties.filter(
        (property): property is TSESTree.Property => property.type === "Property"
      );
    }

    return [];
  },

  /**
   * Gets the potential style reference from a member expression.
   */
  getPotentialStyleReferenceFromMemberExpression(node: TSESTree.MemberExpression): string | undefined {
    if (
      node &&
      'object' in node &&
      node.object &&
      node.object.type === "Identifier" &&
      'name' in node.object &&
      node.object.name &&
      'property' in node &&
      node.property &&
      node.property.type === "Identifier" &&
      'name' in node.property &&
      node.property.name &&
      (!node.parent || node.parent.type !== "MemberExpression")
    ) {
      return [node.object.name, node.property.name].join(".");
    }
    return undefined;
  },

  /**
   * Checks if a node is part of an export declaration.
   */
  isPartOfExport(node: TSESTree.CallExpression): boolean {
    let current = node;
    while (current && current.parent) {
      if (
        current.parent.type === "ExportNamedDeclaration" ||
        current.parent.type === "ExportDefaultDeclaration"
      ) {
        return true;
      }

      // Handle TypeScript satisfies/as expressions in exports
      if (
        current.parent.type === "TSAsExpression" ||
        current.parent.type === "TSSatisfiesExpression"
      ) {
        const tsExpression = current.parent;
        const grandparent = tsExpression.parent;
        if (grandparent && 'parent' in grandparent && grandparent.parent) {
          if (
            grandparent.parent.type === "ExportNamedDeclaration" ||
            grandparent.parent.type === "ExportDefaultDeclaration"
          ) {
            return true;
          }
        }
      }

      current = current.parent as TSESTree.CallExpression;
    }
    return false;
  },

  /**
   * Gets the variable declarator node for a css.create call.
   */
  getVariableDeclarator(node: TSESTree.CallExpression): TSESTree.VariableDeclarator | null {
    if (node.parent) {
      // Handle regular variable declaration: const name = css.create(...)
      if (
        node.parent.type === "VariableDeclarator" &&
        'id' in node.parent &&
        node.parent.id &&
        node.parent.id.type === "Identifier"
      ) {
        return node.parent as TSESTree.VariableDeclarator;
      }

      // Handle TypeScript satisfies expression: const name = css.create(...) satisfies Type
      if (
        node.parent.type === "TSAsExpression" ||
        node.parent.type === "TSSatisfiesExpression"
      ) {
        const tsExpression = node.parent;
        const grandparent = tsExpression.parent;
        if (
          grandparent &&
          grandparent.type === "VariableDeclarator" &&
          'id' in grandparent &&
          grandparent.id &&
          grandparent.id.type === "Identifier"
        ) {
          return grandparent;
        }
      }
    }
    return null;
  },

  /**
   * Gets the variable declaration node for a variable declarator.
   */
  getVariableDeclaration(node: TSESTree.VariableDeclarator): TSESTree.VariableDeclaration | null {
    if (node.parent && node.parent.type === "VariableDeclaration") {
      return node.parent;
    }
    return null;
  },
};

/**
 * ESLint rule: no-unused-styles
 */
const rule = createRule({
  name: 'no-unused-styles',
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Detects unused styles created with css.create from react-strict-dom",
    },
    fixable: "code",
    schema: [],
    messages: {
      unusedStyleSheet: "Unused style sheet: {{styleSheetName}}",
      unusedStyle: "Unused style detected: {{styleSheetName}}.{{styleName}}"
    }
  },
  defaultOptions: [],

  create(context) {
    const styleSheetsData = createStyleSheets();
    const styleReferences = new Set<string>();

    /**
     * Reports unused styles.
     */
    function reportUnusedStyles(unusedStyles: Record<string, TSESTree.Property[]>): void {
      Object.keys(unusedStyles).forEach((styleSheetName) => {
        if ({}.hasOwnProperty.call(unusedStyles, styleSheetName)) {
          const styles = unusedStyles[styleSheetName];

          // If all styles in a stylesheet are unused, remove the entire css.create call
          const cssCreateNode = getCssCreateNode(styleSheetsData, styleSheetName);
          if (
            cssCreateNode &&
            styles.length > 0 &&
            styles.length === astHelpers.getStyleDeclarations(cssCreateNode).length
          ) {
            const variableDeclarator = astHelpers.getVariableDeclarator(cssCreateNode);

            if (variableDeclarator) {
              const variableDeclaration = astHelpers.getVariableDeclaration(variableDeclarator);

              if (variableDeclaration) {
                // If this is the only declarator in the declaration, remove the entire declaration
                if (variableDeclaration.declarations.length === 1) {
                  context.report({
                    node: variableDeclaration,
                    messageId: 'unusedStyleSheet',
                    data: { styleSheetName },
                    fix(fixer) {
                      return fixer.remove(variableDeclaration);
                    },
                  });
                } else {
                  // Otherwise, just remove this declarator
                  context.report({
                    node: variableDeclarator,
                    messageId: 'unusedStyleSheet',
                    data: { styleSheetName },
                    fix(fixer) {
                      // Handle commas similar to property removal
                      const declarators = variableDeclaration.declarations;
                      const declaratorIndex = declarators.findIndex(d => d === variableDeclarator);

                      if (declaratorIndex === -1) {
                        return null;
                      }

                      let rangeToRemove: [number, number];

                      if (declaratorIndex === 0) {
                        // First declarator: remove declarator and the comma after it
                        const nextDeclarator = declarators[1];
                        rangeToRemove = [
                          variableDeclarator.range[0],
                          nextDeclarator.range[0],
                        ];
                      } else {
                        // Not first declarator: remove the comma before it and the declarator
                        const previousDeclarator = declarators[declaratorIndex - 1];
                        rangeToRemove = [
                          previousDeclarator.range[1],
                          variableDeclarator.range[1],
                        ];
                      }

                      return fixer.removeRange(rangeToRemove);
                    },
                  });
                }
                return; // Skip individual style reporting for this stylesheet
              }
            }
          }

          // Report individual unused styles
          styles.forEach((node: TSESTree.Property) => {
            const keyName = node.key.type === 'Identifier' ? node.key.name : 'unknown';

            context.report({
              node,
              messageId: 'unusedStyle',
              data: { 
                styleSheetName,
                styleName: keyName
              },
              fix(fixer) {
                // Get the property node to remove
                const propertyNode = node;

                // Get the parent object (the css.create argument) - we need to traverse up
                // Since ESTree types don't include parent, we'll need to find it differently
                // For now, we'll return null if we can't safely determine the parent
                const parentNode = propertyNode.parent;
                
                if (!parentNode || parentNode.type !== "ObjectExpression") {
                  return null;
                }

                // Check if this is the only property or if there are commas to handle
                const properties = parentNode.properties;
                const propertyIndex = properties.indexOf(propertyNode);

                if (propertyIndex === -1) {
                  return null;
                }

                // If it's the only property, don't remove it (would leave invalid syntax)
                if (properties.length === 1) {
                  return null;
                }

                // Determine the range to remove
                let rangeToRemove: [number, number];

                if (propertyIndex === 0) {
                  // First property: remove property and the comma after it
                  const nextProperty = properties[1];
                  rangeToRemove = [
                    propertyNode.range[0],
                    nextProperty.range[0],
                  ];
                } else {
                  // Not first property: remove the comma before it and the property
                  const previousProperty = properties[propertyIndex - 1];
                  rangeToRemove = [
                    previousProperty.range[1],
                    propertyNode.range[1],
                  ];
                }

                return fixer.removeRange(rangeToRemove);
              },
            });
          });
        }
      });
    }

    /**
     * Gets the exported variable name from an export declaration.
     */
    function getExportedVariableName(node: TSESTree.ExportNamedDeclaration | TSESTree.ExportDefaultDeclaration): string[] {
      if (node.type === "ExportNamedDeclaration") {
        // Handle export declarations with inline variable declarations
        if (node.declaration) {
          if (
            node.declaration.type === "VariableDeclaration" &&
            node.declaration.declarations &&
            node.declaration.declarations.length > 0
          ) {
            // Return all exported variable names
            return node.declaration.declarations
              .filter((decl: TSESTree.VariableDeclarator) => decl.id && decl.id.type === "Identifier")
              .map((decl: TSESTree.VariableDeclarator) => (decl.id as TSESTree.Identifier).name);
          }
        }
        // Handle export statements like: export { foo, bar }
        else if (node.specifiers && node.specifiers.length > 0) {
          return node.specifiers
            .filter(
              (spec: TSESTree.ExportSpecifier) =>
                spec.type === "ExportSpecifier" &&
                spec.local &&
                spec.local.type === "Identifier"
            )
            .map((spec: TSESTree.ExportSpecifier) => (spec.local as TSESTree.Identifier).name);
        }
      } else if (node.type === "ExportDefaultDeclaration" && node.declaration) {
        if (node.declaration.type === "Identifier") {
          return [node.declaration.name];
        }
      }
      return [];
    }

    return {
      // Detects references to styles
      MemberExpression(node: TSESTree.MemberExpression) {
        const styleRef = astHelpers.getPotentialStyleReferenceFromMemberExpression(node);
        if (styleRef) {
          styleReferences.add(styleRef);
        }
      },

      // Detects style sheet declarations
      CallExpression(node: TSESTree.CallExpression) {
        if (astHelpers.isCssCreateCall(node)) {
          const styleSheetName = astHelpers.getStyleSheetName(node);
          const styles = astHelpers.getStyleDeclarations(node);

          // Check if this css.create call is directly exported
          const isDirectlyExported = astHelpers.isPartOfExport(node);

          addStyleSheet(styleSheetsData, styleSheetName, styles, node);

          // If directly exported, mark as exported
          if (isDirectlyExported && styleSheetName) {
            markAsExported(styleSheetsData, styleSheetName);
          }
        }
      },

      // Detects exported stylesheets
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        const exportedNames = getExportedVariableName(node);
        exportedNames.forEach((name: string) => {
          if (getCssCreateNode(styleSheetsData, name)) {
            markAsExported(styleSheetsData, name);
          }
        });
      },

      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        const exportedNames = getExportedVariableName(node);
        exportedNames.forEach((name: string) => {
          if (getCssCreateNode(styleSheetsData, name)) {
            markAsExported(styleSheetsData, name);
          }
        });
      },

      // Handle export statements like: export { foo, bar }
      ExportSpecifier(node: TSESTree.ExportSpecifier) {
        if (node.local && node.local.type === "Identifier") {
          const exportedName = node.local.name;
          if (getCssCreateNode(styleSheetsData, exportedName)) {
            markAsExported(styleSheetsData, exportedName);
          }
        }
      },

      // At the end of the program, check for unused styles
      "Program:exit"() {
        // Mark all used styles
        styleReferences.forEach((reference) => {
          markAsUsed(styleSheetsData, reference);
        });

        // Prepare the unused styles map
        prepareUnusedStyles(styleSheetsData);

        // Report unused styles
        reportUnusedStyles(getUnusedReferences(styleSheetsData));
      },
    };
  },
});

export default rule;
