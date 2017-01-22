/* eslint-env node, mocha */
/* eslint-disable no-var */

require('babel-polyfill');
var transformFile = require('./packages/babel-backwards').transformFile;
var expect = require('chai').expect;
var path = require('path');
var fs = require('fs');
var globSync = require('glob').sync;

var plugins = globSync('babel-plugin-*', {cwd: './packages/'});

plugins.forEach(function (plugin) {
  describe(plugin, function () {
    var tests = globSync('./packages/' + plugin + '/test/**/actual.js');
    tests.forEach(function (file) {
      var testname = path.dirname(file).split(path.sep).slice(-1)[0];
      it(testname, function () {
        expect(
          transformFile(
            file,
            [require.resolve('./packages/' + plugin)]
          )
        ).to.equal(
          fs.readFileSync(
            file.replace('actual.js', 'expected.js'),
            'utf8'
          )
        );
      });
    });
  });
});
