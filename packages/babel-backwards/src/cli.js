import commander from 'commander';
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import {sync as mkdirpSync} from 'mkdirp';
import readStdin from './readStdin';
import recast from 'recast';
import * as babel from 'babel-core';
import objectShorthand from 'babel-plugin-5to6-obj-shorthand';
import commonjsToImport from 'babel-plugin-5to6-commonjs-to-import';
import removeUseStrict from 'babel-plugin-5to6-no-strict';
import {version} from '../package.json';

const usage = commander
  .version(version)
  .usage('[options] [file|indir]')
  .description(
 `Transforms infile with the transforms specified by -t. If -d is
  specified, reads all files from indir and transforms them into files
  in outdir.`
  )
  .option('-d, --out-dir <output directory>', 'Transform entire directory.')
  .option(
    '-t, --transform <transform>',
    'Transform to apply. Can appear multiple times.',
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

export function transformFile(filename: String, plugins: String[]): String {
  const input = filename === '-' ? readStdin() : fs.readFileSync(filename, 'utf8'),
    output: String = babel.transform(input, {
      filename,
      plugins,
      ...defaultBabelOpts
    }).code;

  if (input.endsWith('\n') && !output.endsWith('\n')) {
    return output + '\n';
  }

  return output;
}

export default async function cli(argv: String[]) {
  const {
    args: [filename = '-'],
    transform: desiredTransforms = [],
    outDir
  } = usage.parse(argv);

  const plugins = desiredTransforms.map((name) => {
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
    if (!outDir) {
      process.stdout.write(transformFile(filename, plugins));
    } else {
      const stat = fs.statSync(filename);

      if (stat.isDirectory(filename)) {
        const dirname = filename;

        const files = glob.sync('./**/*.@(js|jsx)', {
          cwd: dirname
        });

        files.forEach(function (filename) {
          const src = path.join(dirname, filename),
            dest = path.join(outDir, filename);

          mkdirpSync(path.dirname(dest));

          console.log(`${src} -> ${dest}`);

          fs.writeFileSync(dest, transformFile(src, plugins));
        });
      }
    }
  } catch (e) {
    console.error(toErrorStack(e));
  }
}
