import commander from 'commander';
import fs from 'fs';
import readStdin from './readStdin';
import recast from 'recast';
import * as babel from 'babel-core';
import objectShorthand from './tranforms/objectShorthand';
import commonjsToImport from './tranforms/commonjsToImport';
import removeUseStrict from './tranforms/removeUseStrict.js';

const usage = commander
  .version('0.0.1')
  .usage(`[options] [file]`)
  .option(
    '-t, --transform <transform>',
    'Transforms to apply. Can specify multiple.',
    (val, acc) => acc.concat(val),
    []
  );

const transforms = {
  'obj-shorthand': {
    description: '{a:a} => {a}',
    plugin: objectShorthand
  },
  'no-strict': {
    description: '"use strict"; => (nothing!)',
    plugin: removeUseStrict
  },
  commonjs: {
    description: 'var a = require("./b"); => import a from "b";',
    plugin: commonjsToImport
  }
};

export default function cli(argv: String[]) {
  const {
    args: [file='-'],
    transform: desiredTransforms
  } = usage.parse(argv);

  const code = file === '-' ? readStdin() : fs.readFileSync(file),
    plugins = desiredTransforms.map(name => {
      if (transforms[name]) {
        return transforms[name].plugin;
      } else {
        console.warn(`Unknown transform: "${name}", skipping.`);
      }
    }).filter(Boolean);

  process.stdout.write(
    babel.transform(code, {
      sourceType: 'module',
      parserOpts: {
        parser: recast.parse,
        allowImportExportEverywhere: false,
        allowReturnOutsideFunction: false,
        plugins: [
          'asyncGenerators',
          'classConstructorCall',
          'classProperties',
          'decorators',
          'doExpressions',
          'exportExtensions',
          'flow',
          'functionSent',
          'functionBind',
          'jsx',
          'objectRestSpread',
          'dynamicImport',
        ]
      },
      generatorOpts: {
        generator: function (...args) {
          // Forces recast to reprint _everything_; maybe a bit
          // dangerous/unperformance, but needs to be here or recast
          // will throw an exception (TODO: still trying to isolate a
          // minimal reproduction of this)
          delete args[0].tokens;

          // Print AST
//          console.log(require('util').inspect(args[0], {depth: null}));

          return recast.print(...args);
        }
      },
      plugins
    }).code
  );
}
