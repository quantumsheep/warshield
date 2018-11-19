#!/usr/bin/env node

const program = require('commander');
const warshield = require('./warshield');
const Reader = require('./src/Reader');
const Spinner = require('./src/Spinner');
const os = require('os');
const path = require('path');
const mkdirp = require('mkdirp');

async function ask_password(confirmation = true) {
  const reader = new Reader();

  const key = await reader.read('Password: ', true);

  if (confirmation) {
    const key2 = await reader.read('Confirm password: ', true);

    process.stdout.write('\u001b[1G\u001b[2K');

    if (key === key2) {
      return key;
    } else {
      throw new Error("Confirmation password doesn't match.");
    }
  } else {
    process.stdout.write('\u001b[1G\u001b[2K');

    return key;
  }
}

/**
 * 
 * @param {string} message 
 * @param {string} filename 
 * @param {boolean} trace 
 * @param {string} error 
 */
function display_verbose(message, filename, trace = false, error = "") {
  const stream = error ? process.stderr : process.stdout;

  stream.write(`${message}\x1b[0m `);
  stream.write(`"${filename}"`);

  if (trace && error) {
    stream.write(` - \x1b[31m${error}\x1b[0m`);
  }

  stream.write('\r\n');
}

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
  .action(async (file, { parent: { verbose, trace, tmp } }) => {
    try {
      const key = await ask_password(true);

      let done = 0;
      let failed = 0;

      if (!verbose) {
        var spinner = new Spinner("Starting encryption...");
        spinner.start();
      }

      const start = process.hrtime();

      if (!tmp) {
        tmp = path.join(os.tmpdir(), 'warshield');
      }

      process.stdout.write(`Creating temporary directory "${tmp}" if it doesn't already exists...`);

      mkdirp(tmp, (err, made) => {
        if (err) {
          console.log(`Can't create temporary directory "${tmp}": ${err.message}.`);

          return process.exit();
        }

        if (!verbose && !made) {
          process.stdout.write('\u001b[1G\u001b[2K');
        } else {
          process.stdout.write(' Done!\n');
          process.stdout.write('Starting encrypting files...\n');
        }

        const encryption = warshield.encryptRecursive(file, key, tmp);

        encryption.on('crawl-found', filename => {
          if (verbose) {
            display_verbose("Added file", filename);
          } else {
            spinner.query = `Crawling files... ${filename}`;
          }
        });

        encryption.on('crawl-failed', (filename, err) => {
          failed++;

          if (verbose) {
            display_verbose("Failed adding", filename, trace, err);
          } else {
            spinner.query = `Crawling files... ${filename}`;
          }
        });

        encryption.on('failed-delete', (filename, err) => {
          if (verbose) {
            display_verbose("\x1b[31mFailed deleting .warshield file", filename, trace, err);
          }
        });

        encryption.on('done', filename => {
          done++;

          if (verbose) {
            display_verbose("\x1b[32mDone encrypting", filename);
          } else {
            spinner.query = `Encrypting files... ${filename}`;
          }
        });

        encryption.on('failed', (filename, err) => {
          failed++;

          if (verbose) {
            display_verbose("\x1b[31mFailed encrypting", filename, trace, err);
          } else {
            spinner.query = `Encrypting files... ${filename}`;
          }
        });

        encryption.on('end', () => {
          const diff = process.hrtime(start);

          if (spinner) {
            spinner.stop();
          }

          if (verbose) {
            process.stdout.write('\r\n');
          } else {
            process.stdout.write('\u001b[1G\u001b[2K');
          }

          console.log(`Finished decrypting files!`);
          console.log(`Elapsed time: ${((diff[0] * 1e9 + diff[1]) / 1e9).toFixed(2)}s!`);
          console.log(`Total decrypted files: ${done}`);
          console.log(`Failed: ${failed} (access denied or non-encrypted files)`);

          process.exit();
        });
      });
    } catch (e) {
      console.error(e.message);
      process.exit();
    }
  });

program
  .command('decrypt <file>')
  .option('-v, --verbose', 'enable verbosity')
  .option('-t, --trace', 'enable stacktrace')
  .option('-p, --tmp <directory>', 'change temporary directory')
  .description('decrypt a file or all files in a directory')
  .action(async (file, { parent: { verbose, trace, tmp } }) => {
    try {
      const key = await ask_password(false);

      let done = 0;
      let failed = 0;

      if (!verbose) {
        var spinner = new Spinner("Starting encryption...");
        spinner.start();
      }

      const start = process.hrtime();

      if (!tmp) {
        tmp = path.join(os.tmpdir(), 'warshield');
      }

      process.stdout.write(`Creating temporary directory "${tmp}"...`);

      mkdirp(tmp, (err, made) => {
        if (err) {
          console.log(`Can't create temporary directory "${tmp}": ${err.message}.`);

          return process.exit();
        }

        if (!verbose && !made) {
          process.stdout.write('\u001b[1G\u001b[2K');
        } else {
          process.stdout.write(' Done!\n');
          process.stdout.write('Starting encrypting files...\n');
        }

        const decryption = warshield.decryptRecursive(file, key, tmp);

        decryption.on('crawl-found', filename => {
          if (verbose) {
            display_verbose("Failed adding", filename);
          } else {
            spinner.query = `Crawling files... ${filename}`;
          }
        });

        decryption.on('crawl-failed', (filename, err) => {
          failed++;

          if (verbose) {
            display_verbose("Failed adding", filename, trace, err);
          } else {
            spinner.query = `Crawling files... ${filename}`;
          }
        });

        decryption.on('failed-delete', (filename, err) => {
          if (verbose) {
            display_verbose("\x1b[31mFailed deleting .warshield file", filename, trace, err);
          }
        });

        decryption.on('done', filename => {
          done++;

          if (verbose) {
            display_verbose("\x1b[32mDone decrypting", filename);
          } else {
            spinner.query = `Decrypting files... ${filename}`;
          }
        });

        decryption.on('failed', (filename, err) => {
          failed++;

          if (verbose) {
            display_verbose("\x1b[31mFailed decrypting", filename, trace, err);
          } else {
            spinner.query = `Decrypting files... ${filename}`;
          }
        });

        decryption.on('end', () => {
          const diff = process.hrtime(start);

          if (spinner) {
            spinner.stop();
          }

          if (verbose) {
            process.stdout.write('\r\n');
          } else {
            process.stdout.write('\u001b[1G\u001b[2K');
          }

          console.log(`Finished decrypting files!`);
          console.log(`Elapsed time: ${((diff[0] * 1e9 + diff[1]) / 1e9).toFixed(2)}s!`);
          console.log(`Total decrypted files: ${done}`);
          console.log(`Failed: ${failed} (access denied or non-encrypted files)`);

          process.exit();
        });
      });
    } catch (e) {
      console.error(e.message);
      process.exit();
    }
  });

program.action(() => program.help());

program.parse(process.argv);

if (process.argv.length < 3) {
  program.help();
}