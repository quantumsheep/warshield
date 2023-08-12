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
  .option('-h, --hide', 'enable filenames encryption. A metadata file will be created in the same directory. Do not loose the metadata file if you want to be able to restore the names. The decription of names is automatic')
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
