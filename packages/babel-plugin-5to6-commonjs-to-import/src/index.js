import * as t from 'babel-types';
import {groupBy, toPairs, values} from 'lodash';

// 'require("b")("c")("d").e.f.g' => {
//    literal: stringLiteral('b'),
//    path: ['e', 'f', 'g'],
//    calls: [[t.stringLiteral("c")], [t.stringLiteral("d")]]
// }
//
// also handles require()s without property lookups or immediate calls.
// returns null if node is not a require call
function matchNestedRequire(node) {
  if (t.isCallExpression(node)) {
    if (t.isIdentifier(node.callee, {name: 'require'}) &&
        node.arguments.length === 1 &&
        t.isStringLiteral(node.arguments[0])) {
      return {literal: node.arguments[0], path: [], calls: []};
    } else if (t.isCallExpression(node.callee)) {
      const child = matchNestedRequire(node.callee);
      if (child === null) {
        return null;
      }

      child.calls.push(node.arguments);
      return child;
    } else {
      return null;
    }
  } else if (t.isMemberExpression(node)) {
    const child = matchNestedRequire(node.object);
    if (child === null) {
      return null;
    }

    child.path.push(node.property.name);
    return child;
  } else {
    return null;
  }
}

// converts a destructuring pattern to a mapping of bindings to
// property paths. Computed properties and assignment patterns
// (default destructuring values) aren't supported.
//
// eg '{x: {a: b, c: [d], e: b}}' => {b: ['x', 'e'], d: ['x', 'c', 0]}
function destructureToPaths(node) {
  if (t.isObjectPattern(node)) {
    const children = node.properties.map(destructureToPaths);
    if (children.some((x) => x === null)) {
      return null;
    }
    return Object.assign(...children);
  } else if (t.isObjectProperty(node)) {
    if (!t.isIdentifier(node.key)) {
      return null;
    }

    if (t.isIdentifier(node.value)) {
      // at a leaf, eg the base {a: b} case
      return {[node.value.name]: [node.key.name]};
    } else {
      const children = destructureToPaths(node.value);
      if (children === null) {
        return null;
      }

      const subPaths = values(children);
      if (subPaths.some((x) => x === null)) {
        return null;
      }

      subPaths.forEach((path) => path.unshift(node.key.name));
      return children;
    }
  } else if (t.isArrayPattern(node)) {
    const children = node.elements.map((child, idx) => {
      if (t.isIdentifier(child)) {
        // at a leaf, eg the base [a] case
        return {[child.name]: [idx]};
      } else if (child === null) {
        // empty idx in array, eg index 0 of [,x]
        return {};
      } else if (t.isPattern(child)) {
        const children = destructureToPaths(child);
        if (children === null) {
          return null;
        }

        const subPaths = values(children);
        if (subPaths.some((x) => x === null)) {
          return null;
        }

        subPaths.forEach((path) => path.unshift(idx));
        return children;
      }

      return null;
    });

    if (children.some((x) => x === null)) {
      return null;
    }

    return Object.assign(...children);
  }
  return null;
}


function coerceToImport(id, init, kind, path) {
  // 'var foo = require("bar")' => 'import foo from "bar"'
  const requireInfo = matchNestedRequire(init);
  if (requireInfo === null) {
    return null;
  }
  const {
    literal: importLiteral,
    path: importPath,
    calls: importCalls
  } = requireInfo;

  if (t.isIdentifier(id)) {
    if (importCalls.length > 0) {
      // handle 'var a = require("b")("c")' cases. Currently doesn't
      // work with any of the other fancy case handling (eg nested
      // lookups, etc).
      if (importPath.length !== 0) {
        return null;
      }

      // TODO: deeper immediate calls
      if (importCalls.lenght > 1) {
        return null;
      }

      const importId = path.scope.generateUidIdentifier(id.name);
      return [
        t.importDeclaration([t.importDefaultSpecifier(importId)], importLiteral),
        t.variableDeclaration(kind, [
          t.variableDeclarator(
            t.identifier(id.name),
            t.callExpression(importId, importCalls[0])
          )
        ])
      ];
    }

    if (importPath.length === 0) {
      // simple 'var x = require("b")' case
      return t.importDeclaration(
        [t.importDefaultSpecifier(t.identifier(id.name))],
        importLiteral
      );
    } else if (importPath.length === 1) {
      // simple 'var x = require("b").y' case
      return t.importDeclaration(
        [t.importSpecifier(
          t.identifier(id.name),
          t.identifier(importPath[0])
        )],
        importLiteral
      );
    } else if (importPath.length === 1) {
      // hard 'var x = require("b").y.z' cases--unhandled;
      return null;
    }
  } else if (t.isPattern(id)) {
    // 'var {a: {b: c}} = require("d").e.f;'
    const bindingsMaybe = destructureToPaths(id);
    if (bindingsMaybe === null) {
      return null;
    }
    const bindings = toPairs(bindingsMaybe).map(([binding, path]) => (
      [binding, importPath.concat(path)]
    ));

    const {direct = [], deep = []} = groupBy(bindings, ([, path]) => {
      return path.length === 1 ? 'direct' : 'deep';
    });

    if (deep.length > 0) {
      return null;
    }

    return t.importDeclaration(
      direct.map(([binding, [path]]) => t.importSpecifier(
        t.identifier(binding),
        t.identifier(path)
      )),
      importLiteral
    );
  }

  return null;
}

export default function commonjsToImport() {
  return {
    visitor: {
      VariableDeclaration(path) {
        const {node} = path;

        let anyNewImports = false;
        const newNodes =
          node.declarations.map(({...decl, id, init}) => {
            const newImport = coerceToImport(id, init, node.kind, path);
            if (newImport) {
              anyNewImports = true;
              return newImport;
            }
            return t.variableDeclaration(node.kind, [decl]);
          });

        if (anyNewImports) {
          return path.replaceWithMultiple(
            // flatten: coerceToImport can return a list of multiple
            // decls
            [].concat.apply([], newNodes)
          );
        }
      }
    }
  };
}
