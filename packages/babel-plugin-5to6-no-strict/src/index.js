import * as t from 'babel-types';

export default function removeUseStrict() {
  return {
    visitor: {
      ExpressionStatement(path) {
        if (t.isStringLiteral(path.node.expression, {value: 'use strict'})) {
          path.remove();
        }
      },
      Directive(path) {
        if (path.node.value.value === 'use strict') {
          path.remove();
        }
      }
    }
  };
}
