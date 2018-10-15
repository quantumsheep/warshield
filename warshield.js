#!/usr/bin/env node

let [, , action, file, key] = process.argv;

if (!action || !file || !key) {
  console.log('warshield (encrypt|decrypt) (file) (key)');
  process.exit();
}

action = action.toLowerCase();

if (action === 'encrypt') {
  require('./encrypt')(file, key);
} else if (action === 'decrypt') {
  require('./decrypt')(file, key);
} else {
  console.log('warshield: unknown action');
}