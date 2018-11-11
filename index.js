const program = require('commander');
const warshield = require('./warshield');
const Reader = require('./src/Reader');

async function ask_password(confirmation = true) {
  const reader = new Reader();

  const key = await reader.read('Password: ', true);

  if (confirmation) {
    const key2 = await reader.read('Confirm password: ', true);

    if (key === key2) {
      return key;
    } else {
      throw new Error("Confirmation password doesn't match.");
    }
  } else {
    return key;
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
  .action(async (file, cmd) => {
    try {
      const key = await ask_password(true);

      let done = 0;
      let failed = 0;

      const start = process.hrtime();

      const encryption = warshield.encryptRecursive(file, key);

      encryption.on('done', filename => {
        done++;
        console.log(`\x1b[32mDone encrypting\x1b[0m ${filename}`);
      });

      encryption.on('failed', filename => {
        failed++;
        console.log(`\x1b[31mFailed encrypting\x1b[0m ${filename}`);
      });

      encryption.on('end', () => {
        const diff = process.hrtime(start);

        process.stdout.write('\r\n');
        console.log(`Finished encrypting files!`);
        console.log(`Elapsed time: ${((diff[0] * 1e9 + diff[1]) / 1e9).toFixed(2)}s!`);
        console.log(`Total encrypted files: ${done}`);
        console.log(`Failed: ${failed} (access denied files)`);

        process.exit();
      });
    } catch (e) {
      console.error(e.message);
      process.exit();
    }
  });

program
  .command('decrypt <file>')
  .option('-v, --verbose', 'enable verbosity')
  .description('decrypt a file or all files in a directory')
  .action(async (file, cmd) => {
    try {
      const key = await ask_password(false);

      let done = 0;
      let failed = 0;

      const start = process.hrtime();

      const decryption = warshield.decryptRecursive(file, key);

      decryption.on('done', filename => {
        done++;
        console.log(`\x1b[32mDone decrypting\x1b[0m ${filename}`);
      });

      decryption.on('failed', filename => {
        failed++;
        console.log(`\x1b[31mFailed decrypting\x1b[0m ${filename}`);
      });

      decryption.on('end', () => {
        const diff = process.hrtime(start);

        process.stdout.write('\r\n');
        console.log(`Finished decrypting files!`);
        console.log(`Elapsed time: ${((diff[0] * 1e9 + diff[1]) / 1e9).toFixed(2)}s!`);
        console.log(`Total decrypted files: ${done}`);
        console.log(`Failed: ${failed} (access denied or non-encrypted files)`);

        process.exit();
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