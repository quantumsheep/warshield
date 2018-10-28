#!/usr/bin/env node

const program = require('commander');
const fs = require('fs');
const util = require('util');
const wall = require('./wall');
const { walk, arrayLoop, eraseline } = require('./helpers');

function gate(mode, file, verbose = false) {
  const readline = require('readline');
  const rl = readline.createInterface(process.stdin, process.stdout);

  let i = false;
  let query = 'Password: ';

  rl._writeToOutput = stringToWrite => {
    if (i) {
      rl.output.write(`${eraseline}${query}`);
    } else {
      rl.output.write(stringToWrite);
      i = true;
    }
  }

  rl.question(query, key => {
    if (mode === 'encrypt') {
      i = false;
      query = 'Confirm password: ';

      process.stdout.write('\n');
      rl.question(query, key2 => {
        if (key !== key2) {
          console.log('\nPasswords does not match.');
          return process.exit();
        }

        rl.close();

        process.stdout.write(`${eraseline}\b${eraseline}`);
        cipher(mode, file, key, verbose);
      });
    } else {
      rl.close();

      process.stdout.write(eraseline);
      cipher(mode, file, key, verbose);
    }
  });
}

async function cipher(mode, file, key, verbose = false) {
  try {
    const start = process.hrtime();

    const stat = await util.promisify(fs.stat)(file);

    let { filelist: files, failed = 0 } = stat.isDirectory() ? await walk(file, verbose) : { filelist: [file] };

    const fileslength = files.length + failed;

    if (files[0] !== file) {
      if (verbose) {
        console.log('Crawling directories... Done!');
      } else {
        process.stdout.write(`${eraseline}Crawling directories... Done!\n`);
      }
    }

    const isEncrypt = mode === 'encrypt';

    const action = mode.slice(0, 1).toUpperCase() + mode.slice(1) + 'ing';

    const loop = arrayLoop(files, file => {
      return wall.cipherizeFile(file, key, isEncrypt)
        .then(() => {
          if (verbose) {
            console.log(`\x1b[32mDone ${mode}ing\x1b[0m ${file}`)
          } else {
            process.stdout.write(`${eraseline}${action}... ${file}`);
          }
        })
        .catch(() => {
          failed++;

          if (verbose) {
            console.log(`\x1b[31mFailed ${mode}ing\x1b[0m ${file}`);
          } else {
            process.stdout.write(`${eraseline}${action}... ${file}`);
          }
        });
    });

    let done = 0;

    const next = () => {
      repeat();

      if (++done >= files.length) {
        if (!verbose) {
          process.stdout.write(eraseline);
        }

        const diff = process.hrtime(start);

        console.log(`Finished ${action.toLowerCase()} files!`);
        console.log(`Elapsed time: ${((diff[0] * 1e9 + diff[1]) / 1e9).toFixed(2)}s!`);
        console.log(`Total ${mode}ed files: ${fileslength - failed}`);
        console.log(`Failed: ${failed} (access denied or non-encrypted files)`);
      }
    }

    const repeat = () => {
      const wait = loop.next();

      if (wait.value) {
        wait.value.then(next).catch(next);
      }
    }

    for (let i = 0; i < 5; i++) {
      repeat();
    }
  } catch (e) {
    console.error(e.message);
  }
}

program
  .version('2.2.0', '-V, --version')
  .usage('[options] <mode> <dir>')
  .option('-v, --verbose', 'enable verbosity');

program
  .command('encrypt <file>')
  .option('-v, --verbose', 'enable verbosity')
  .description('encrypt a file or all files in a directory')
  .action((file, cmd) => gate('encrypt', file, cmd.parent.verbose === true));

program
  .command('decrypt <file>')
  .option('-v, --verbose', 'enable verbosity')
  .description('decrypt a file or all files in a directory')
  .action((file, cmd) => gate('decrypt', file, cmd.parent.verbose === true));

program.action(() => program.help());

program.parse(process.argv);

if (process.argv.length < 3) {
  program.help();
}