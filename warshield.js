#!/usr/bin/env node

let [, , action, file, key] = process.argv;

if (!action || !file || !key) {
  console.log('warshield (encrypt|decrypt) (file) (key)');
  process.exit();
}

action = action.toLowerCase();

if (action === 'encrypt' || action === 'decrypt') {
  const fs = require('fs');
  const util = require('util');
  const wall = require('./wall');
  const { walk, arrayLoop } = require('./helpers');

  (async () => {
    try {
      const stat = await util.promisify(fs.stat)(file);

      const files = stat.isDirectory() ? await walk(file) : [file];

      const loop = arrayLoop(files, file => {
        return wall.cipherizeFile(file, key, action === 'encrypt')
          .then(() => process.stdout.write(`\x1b[32mDone ${action}ing\x1b[0m - ${file}\n`))
          .catch(() => process.stdout.write(`\x1b[31mFAILED ${action}ing\x1b[0m - ${file}\n`));
      });

      const repeat = () => {
        const wait = loop.next();

        if (wait.value) {
          wait.value.then(repeat);
        }
      }

      for (let i = 0; i < 5; i++) {
        repeat();
      }
    } catch (e) {
      console.error(e.message);
    }
  })();
} else {
  console.log('warshield: unknown action');
}