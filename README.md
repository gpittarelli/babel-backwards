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

 - babel already has really nice error handling and similar tooling
   worked out, allowing the actual transforms to just be implemented
   by themselves.
 - lebab is based on the espree JS parser, which doesn't support as
   many features as babylon; so it doens't support the (admittedly
   awkward case) of upgrading files that already use some experimental
   features.

Many thanks to [hzoo](https://github.com/hzoo) for making this
possible (see https://github.com/lebab/lebab/issues/138)

## Usage

    npm i -g babel-backwards
    echo '"use strict";1 + 1;' | babel-backwards -t no-strict
    # => 1 + 1;

## Development

    git clone https://github.com/gpittarelli/babel-backwards
    npm i
    npm run bootstrap
    npm watch &
    ./packages/babel-backwards/bin/babel-backwards --help

## License

Released under the MIT License. See the LICENSE file for full text

Copyright © 2017 George Pittarelli
