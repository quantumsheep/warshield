#!/usr/bin/env node

const program = require('commander');
const showUI = require('./src/UserInterface');
const { encrypt, decrypt } = require('./src/index');

program
  .version('2.2.0', '-V, --version')
  .usage('[options] <mode> <dir>')
  .option('-v, --verbose', 'enable verbosity')
  .option('-t, --trace', 'enable stacktrace')
  .option('-p, --tmp <directory>', 'change temporary directory');

program
  .command('encrypt <file>')
  .option('-v, --verbose', 'enable verbosity')
  .option('-t, --trace', 'enable stacktrace')
  .option('-p, --tmp <directory>', 'change temporary directory')
  .description('encrypt a file or all files in a directory')
  .action(async (file, options) => {
    await encrypt(file, options);
  });

program
  .command('decrypt <file>')
  .option('-v, --verbose', 'enable verbosity')
  .option('-t, --trace', 'enable stacktrace')
  .option('-p, --tmp <directory>', 'change temporary directory')
  .description('decrypt a file or all files in a directory')
  .action(async (file, options) => {
    await decrypt(file, options);
  });

program.action(() => program.help());

program.parse(process.argv);

if (process.argv.length < 3) {
  (async () => { await showUI() })();
}