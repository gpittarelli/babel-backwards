import * as t from 'babel-types';

function coerceToImport(id, init) {
  // 'var foo = require("bar")' => 'import foo from "bar"'
  if (t.isIdentifier(id) &&
      t.isCallExpression(init) &&
      t.isIdentifier(init.callee, {name: 'require'}) &&
      init.arguments.length === 1 &&
      t.isStringLiteral(init.arguments[0])) {
    return t.importDeclaration(
      [t.importDefaultSpecifier(
        t.identifier(id.name)
      )],
      t.stringLiteral(init.arguments[0].value)
    );
  }

  // 'var foo = require("bar").baz' => 'import {baz as foo} from "bar"'
  if (t.isIdentifier(id) &&
      t.isCallExpression(init) &&
      t.isIdentifier(init.callee, {name: 'require'}) &&
      init.arguments.length === 1 &&
      t.isStringLiteral(init.arguments[0])) {
    return t.importDeclaration(
      [t.importSpecifier(
        t.identifier(id.name),
        // imported
      )],
      t.stringLiteral(init.arguments[0].value)
    );
  }
}

export default function commonjsToImport() {
  return {
    visitor: {
      VariableDeclaration(path) {
        const convertedImports = [],
          {node} = path;

        node.declarations =
          node.declarations.filter(({id, init}) => {
            const newImport = coerceToImport(id, init);
            if (newImport) {
              convertedImports.push(newImport);
              return false;
            }
            return true;
          });

        if (convertedImports.length > 0) {
          path.replaceWithMultiple(convertedImports.concat(path.node));
        }
      }
    }
  };
}
