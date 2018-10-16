const path = require('path');
const fs = require('fs');
const util = require('util');

const walk = async (dir, filelist = []) => {
  const files = await util.promisify(fs.readdir)(dir);

  for (file of files) {
    const filepath = path.join(dir, file);

    try {
      const stat = await util.promisify(fs.stat)(filepath);

      if (stat.isDirectory()) {
        filelist = await walk(filepath, filelist);
      } else {
        filelist.push(filepath);

        if (filepath.length > 50) {
          console.log(`Added in file queue: ${filepath.slice(0, 25)}[...]${filepath.slice(-25)}`);
        } else {
          console.log(`Added in file queue: ${filepath}`);
        }
      }
    } catch (e) {
      if (filepath.length > 50) {
        console.log(`\x1b[31mNot added in file queue: ${filepath.slice(0, 25)}[...]${filepath.slice(-25)}\x1b[0m`);
      } else {
        console.log(`\x1b[31mNot added in file queue: ${filepath}\x1b[0m`);
      }
    }
  }

  return filelist;
}

/**
 * @param {any[]} arr 
 * @param {(...any?) => any} action 
 */
function* arrayLoop(arr, action) {
  for (a of arr) {
    yield action(a);
  }
}

module.exports = { walk, arrayLoop };