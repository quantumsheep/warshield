#!/usr/bin/env node

const { program } = require('commander');
const showUI = require('./src/UserInterface');
const { encrypt, decrypt } = require('./src/index');

program
  .version('3.0.1', '-V, --version')
  .usage('[options] <mode> <dir>');

program
  .command('encrypt <file>')
  .option('-v, --verbose', 'enable verbosity')
  .option('-t, --trace', 'enable stacktrace')
  .option('-p, --tmp <directory>', 'change temporary directory')
  .description('encrypt a file or all files in a directory')
  .action(encrypt);

program
  .command('decrypt <file>')
  .option('-v, --verbose', 'enable verbosity')
  .option('-t, --trace', 'enable stacktrace')
  .option('-p, --tmp <directory>', 'change temporary directory')
  .description('decrypt a file or all files in a directory')
  .action(decrypt);

program.action(() => program.help());

if (process.argv.length < 3) {
  showUI();
} else {
  program.parse();
}
