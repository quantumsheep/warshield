const path = require('path');
const fs = require('fs');
const util = require('util');

const eraseline = '\u001b[1G\u001b[2K';

const walk = async (dir, verbose = false, filelist = [], failed = 0) => {
  const files = await util.promisify(fs.readdir)(dir);

  for (file of files) {
    const filepath = path.join(dir, file);

    try {
      const stat = await util.promisify(fs.stat)(filepath);

      if (stat.isDirectory()) {
        const result = await walk(filepath, verbose, filelist, failed);
        failed = result.failed;
        filelist = result.filelist;
      } else {
        filelist.push(filepath);

        if (verbose) {
          console.log(`Added file ${filepath}`);
        } else {
          process.stdout.write(`${eraseline}Crawling directories... ${filename}`);
        }
      }
    } catch (e) {
      if (verbose) {
        console.log(`\x1b[31mCan't add file ${filepath} (access denied)\x1b[0m`);
      }

      failed++;
    }
  }

  return {
    filelist,
    failed,
  };
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

module.exports = { walk, arrayLoop, eraseline };