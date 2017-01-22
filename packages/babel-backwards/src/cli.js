import commander from 'commander';
import fs from 'fs';
import readStdin from './readStdin';
import recast from 'recast';
import * as babel from 'babel-core';
import objectShorthand from 'babel-plugin-5to6-obj-shorthand';
import commonjsToImport from './tranforms/commonjsToImport';
import removeUseStrict from 'babel-plugin-5to6-no-strict';

const usage = commander
  .version('0.0.1')
  .usage('[options] [file]')
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

const defaultBabelOpts = {
  sourceType: 'module',
  babelrc: false,
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
      // dangerous/unperformant, but needs to be here or recast
      // will throw an exception (TODO: still trying to isolate a
      // minimal reproduction of this)
      delete args[0].tokens;

      // Print AST
      //console.log(require('util').inspect(args[0], {depth: null}));

      return recast.print(...args);
    }
  }
};

// From babel-cli:
function toErrorStack(err) {
  if (err._babel && err instanceof SyntaxError) {
    return `${err.name}: ${err.message}\n${err.codeFrame}`;
  } else {
    return err.stack;
  }
}

export default function cli(argv: String[]) {
  const {
    args: [filename = '-'],
    transform: desiredTransforms = []
  } = usage.parse(argv);

  const code = filename === '-' ? readStdin() : fs.readFileSync(filename),
    plugins = desiredTransforms.map((name) => {
      if (transforms[name]) {
        return transforms[name].plugin;
      } else {
        let plugin;
        try {
          plugin = require(`babel-plugin-${name}`);
        } catch (e) {}

        if (plugin) {
          return plugin;
        } else {
          console.warn(`Unknown transform: "${name}", skipping.`);
        }
      }
    }).filter(Boolean);

  try {
    const result = babel.transform(code, {
      filename,
      plugins,
      ...defaultBabelOpts
    }).code;

    process.stdout.write(result);
  } catch (e) {
    console.error(toErrorStack(e));
  }
}
