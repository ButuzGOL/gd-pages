#!/usr/bin/env node

'use strict';

process.bin = process.title = 'gd-pages';

var program = require('commander');
var pkg = require('./package.json');

var gdPages = require('./');

program
  .version(pkg.version)
  .usage('<serviceAccountEmail> <pathToKeyFile> <folderPath> <folderName>' +
    ' [subFolderName]');

program.on('--help', function(){
  console.log('  Example:');
  console.log('');
  console.log('    $ gd-pages abc@developer.gserviceaccount.com ./key.pem ./dist project');
  console.log('');
});

program.parse(process.argv);

if (program.args.length < 4) {
   console.error('You should specify at least four arguments, use --help');
   process.exit(1);
}

gdPages.apply(null, program.args);
