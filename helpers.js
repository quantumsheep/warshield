const path = require('path');
const fs = require('fs');
const util = require('util');

const walk = async (dir, filelist = []) => {
  const files = await util.promisify(fs.readdir)(dir);

  for (file of files) {
    const filepath = path.join(dir, file);
    const stat = await util.promisify(fs.stat)(filepath);

    if (stat.isDirectory()) {
      filelist = await walk(filepath, filelist);
    } else {
      filelist.push(filepath);
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