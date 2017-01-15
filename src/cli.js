import commander from 'commander';
import fs from 'fs';
import readStdin from './readStdin';
import recast from 'recast';
import * as babel from 'babel-core';
import objectShorthand from './tranforms/objectShorthand';

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
  }
};

export default function cli(argv) {
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
      parserOpts: {
        parser: recast.parse,
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
        ],
      },
      generatorOpts: {
        generator: recast.print,
      },
      plugins
    }).code
  );
}
