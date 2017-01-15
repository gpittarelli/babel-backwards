# babel-backwards

TODO: (maybe babel-5to6 is a better name?)

Babel port of [lebab](https://github.com/lebab/lebab)--a project for
transforming ES5 code to use features introduced in ES2015 and beyond.

This project aims to provide ports of `lebab`'s transforms packaged as
babel presets (eg `babel-preset-5to6-commonjs`); that way this
project's CLI could be wholly replaced by just passing the right
options to [babel](https://babeljs.io/docs/usage/cli/). It also
provides `babel-backwards`, a CLI similar to `lebab` (not quite a
drop-in replacement though, for example specifying multiple transforms
will run all of them).

Why recreate lebab in the Babel ecosystem? A few reasons: (inspired by
https://github.com/lebab/lebab/issues/138)

 - lebab has some annoying error handling and other annoyances, which babel
 - lebab is based on the espree JS parser, which doesn't support as
   many features as ; so a

Many thanks to [hzoo](https://github.com/hzoo) for making this
possible (see https://github.com/lebab/lebab/issues/138)
