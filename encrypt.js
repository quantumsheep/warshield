const fs = require('fs');
const util = require('util');
const path = require('path');
const wall = require('./wall');

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

const init = async (file, key) => {
  try {
    if (!file || !key) {
      return console.log('encrypt (file) (key)');
    }

    const stat = await util.promisify(fs.stat)(file);

    if (stat.isDirectory()) {
      const files = await walk(file);

      files.forEach(file => {
        wall.encryptFile(file, key)
          .then(() => console.log(file, true))
          .catch(() => console.error(file, false))
      });
    } else {
      wall.encryptFile(file, key)
        .then(() => console.log(file, true))
        .catch(() => console.error(file, false))
    }
  } catch (e) {
    console.error(e.message);
  }
}

module.exports = init;