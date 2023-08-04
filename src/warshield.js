const fs = require('fs');
const { EventEmitter } = require('events');
const util = require('util');
const crypto = require('crypto');
const path = require('path');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const MIN_ROUNDS = 3000;
const MAX_ROUNDS = 9000;
const METADATA_FILE = 'metadata.json'

/**
 * @param {any[]} arr 
 * @param {(...any?) => void} action 
 * @returns {IterableIterator<Promise<string>>} 
 */
function* arrayLoop(arr, action) {
  for (a of arr) {
    yield action(a);
  }
}

/**
 * Hash a key to make it valid for WarShield's encryption algorithm 
 * 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @param {number} rounds 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} salt 
 * @returns {Promise<[Buffer, string | Buffer | NodeJS.TypedArray | DataView]>}
 */
function generateKey(key, rounds, salt = null) {
  return new Promise((resolve, reject) => {
    salt = salt || crypto.randomBytes(64);

    crypto.pbkdf2(key, salt, rounds, 32, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);

      resolve([derivedKey, salt]);
    });
  });
}

/**
 * Generate a ciphering stream (`crypto.CipherGCM`) and returns a random IV + the ciphering stream
 * 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @returns {{ iv: Buffer, stream: import('crypto').CipherGCM }}
 */
function encryptStream(key) {
  const iv = crypto.randomBytes(16);
  const stream = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  return {
    iv,
    stream,
  };
}

/**
 * Generate a deciphering stream (`crypto.DecipherGCM`) and returns the stream
 * 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} iv 
 * @returns {import('crypto').DecipherGCM}
 */
function decryptStream(key, iv) {
  return crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
}

/**
 * Encrypt a file
 * 
 * @param {string} file 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @param {string} tmp 
 * @returns {Promise<string>}
 */
function encryptFile(file, key, tmp) {
  return new Promise(async (resolve, reject) => {
    // Generate warshield file id
    const id = crypto.randomBytes(8).toString('hex');
    const targetpath = path.join(tmp, `${id}.warshield`);

    // Error function
    const ERROR = (err = "") => {
      fs.unlink(targetpath, () => { });
      reject(err.message ? err.message : err);
    }

    const rounds = Math.floor(Math.random() * (MAX_ROUNDS - MIN_ROUNDS) + MIN_ROUNDS);
    const [derivedKey, salt] = await generateKey(key, rounds);

    // Create cipher stream
    const cipher = encryptStream(derivedKey);
    cipher.stream.on('error', ERROR);

    const source_rs = fs.createReadStream(file).on('error', ERROR);
    const target_ws = fs.createWriteStream(targetpath).on('error', ERROR);

    if (!source_rs.readable || !target_ws.writable) {
      return reject(false);
    }

    // Pipe original file into cipher and cipher into warshield file
    const stream = source_rs.pipe(cipher.stream).pipe(target_ws);

    stream.on('finish', () => {
      cipher.stream.end();
      source_rs.close();
      target_ws.close();

      const target_rs = fs.createReadStream(targetpath).on('error', ERROR);
      const source_ws = fs.createWriteStream(file).on('error', ERROR);

      const tag = cipher.stream.getAuthTag();

      source_ws.write(salt);
      source_ws.write(cipher.iv);
      source_ws.write(tag);
      source_ws.write(Buffer.from(String(rounds)));

      // Pipe warshield file into original file
      target_rs.pipe(source_ws).on('finish', () => {
        target_rs.close();
        source_ws.close();

        fs.unlink(targetpath, err => resolve(err));
      });
    });
  });
}

/**
 * Decrypt a file
 * 
 * @param {string} file 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @param {string} tmp 
 * @returns {Promise<string>}
 */
function decryptFile(file, key, tmp) {
  return new Promise((resolve, reject) => {
    // Generate warshield file id
    const id = crypto.randomBytes(8).toString('hex');
    const targetpath = path.join(tmp, `${id}.warshield`);

    // Error function
    const ERROR = (err = "") => {
      fs.unlink(targetpath, () => { });
      reject(err.message ? err.message : err);
    }

    const source_rs = fs.createReadStream(file, { end: 100 }).on('error', ERROR);

    if (!source_rs.readable) {
      return reject('File not readable');
    }

    source_rs.on('open', async fd => {
      try {
        const read = util.promisify(fs.read);

        const { buffer: bufs } = await read(fd, Buffer.alloc(100), 0, 100, 0);
        const salt = bufs.slice(0, 64);
        const iv = bufs.slice(64, 80);
        const tag = bufs.slice(80, 96);
        const rounds = bufs.slice(96, 100);

        source_rs.close();

        if (isNaN(rounds)) {
          reject(`File broken or already decrypted`);
        }

        const [derivedKey] = await generateKey(key, parseInt(rounds), salt);

        // Create cipher stream
        const decipher = decryptStream(derivedKey, iv).on('error', ERROR);
        decipher.setAuthTag(tag);

        const data_rs = fs.createReadStream(file, { start: 100 }).on('error', ERROR);
        const target_ws = fs.createWriteStream(targetpath).on('error', ERROR);

        if (!data_rs.readable || !target_ws.writable) {
          return reject(false);
        }

        // Pipe original file into cipher and cipher into warshield file
        const stream = data_rs.pipe(decipher).pipe(target_ws);

        stream.on('finish', () => {
          decipher.end();
          data_rs.close();
          target_ws.close();

          const target_rs = fs.createReadStream(targetpath).on('error', ERROR);
          const source_ws = fs.createWriteStream(file).on('error', ERROR);

          // Pipe warshield file into original file
          target_rs.pipe(source_ws).on('finish', () => {
            target_rs.close();
            source_ws.close();

            fs.unlink(targetpath, err => resolve(err));
          });
        });
      } catch (e) {
        ERROR(e);
      }
    });
  });
}

/**
 * Recursively encrypt files from a given directory (can be a file)
 * 
 * @param {string} file 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @param {string} tmp 
 * @returns {EventEmitter} 
 */
function encryptRecursive(file, key, tmp) {
  const em = new EventEmitter();

  fs.stat(file, (err, stat) => {
    if (err) {
      em.emit('crawl-failed', file, err.message);
      em.emit('end');
      return;
    }

    const files = [];

    if (stat.isDirectory()) {
      getFiles(file)
        .on('found', file => {
          files.push(file);
          em.emit('crawl-found', file);
        })
        .on('failed', file => em.emit('crawl-failed', file))
        .on('end', () => {
          const loop = arrayLoop(files, file => {
            return encryptFile(file, key, tmp)
              .then(err => {
                em.emit('done', file);

                if (err) {
                  em.emit('failed-delete', `${file}.warshield`);
                }
              })
              .catch(() => em.emit('failed', file));
          });

          let done = 0;

          const end = () => {
            if (++done >= files.length) {
              em.emit('end');
            }
          }

          const next = () => {
            const wait = loop.next();

            if (wait.value) {
              wait.value.finally(() => {
                next();
                end();
              });
            }
          }

          for (let i = 0; i < 5; i++) {
            next();
          }
        });
    } else {
      encryptFile(file, key, tmp)
        .then(() => em.emit('done', file))
        .catch(() => em.emit('failed', file))
        .finally(() => em.emit('end'));
    }
  });

  return em;
}

/**
 * Recursively decrypt files from a given directory (can be a file)
 * 
 * @param {string} file 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @param {string} tmp 
 * @returns {EventEmitter} 
 */
function decryptRecursive(file, key, tmp) {
  const em = new EventEmitter();

  fs.stat(file, (err, stat) => {
    if (err) {
      em.emit('crawl-failed', file, err);
      em.emit('end');
      return;
    }

    const files = [];

    if (stat.isDirectory()) {
      getFiles(file)
        .on('found', file => {
          files.push(file);
          em.emit('crawl-found', file);
        })
        .on('failed', (file, err) => em.emit('crawl-failed', file, err))
        .on('end', () => {
          let done = 0;

          const loop = arrayLoop(files, file => {
            return decryptFile(file, key, tmp)
              .then(err => {
                em.emit('done', file);

                if (err) {
                  em.emit('failed-delete', `${file}.warshield`, err);
                }
              })
              .catch(err => em.emit('failed', file, err));
          });

          const end = () => {
            if (++done >= files.length) {
              em.emit('end');
            }
          }

          const next = () => {
            const wait = loop.next();

            if (wait.value) {
              wait.value.finally(() => {
                next();
                end();
              });
            }
          }

          for (let i = 0; i < 5; i++) {
            next();
          }
        });
    } else {
      decryptFile(file, key, tmp)
        .then(() => em.emit('done', file))
        .catch((err) => em.emit('failed', file, err))
        .finally(() => em.emit('end'));
    }
  });

  return em;
}

/**
 * @param {string} directory 
 * @returns {EventEmitter}
 */
function getFiles(directory) {
  const em = new EventEmitter();

  fs.readdir(directory, (err, files) => {
    if (err) {
      em.emit('failed', directory, err);
      return em.emit('end');
    }

    let done = 0;

    function end() {
      if (++done >= files.length) {
        em.emit('end');
      }
    }

    if (files.length === 0) {
      end();
    }

    for (let i in files) {
      const filepath = path.join(directory, files[i]);

      fs.stat(filepath, (err, stat) => {
        if (err) {
          em.emit('failed', filepath, err);
          return end();
        }

        if (stat.isDirectory()) {
          getFiles(filepath, false)
            .on('failed', (file, err) => em.emit('failed', file, err))
            .on('found', file => em.emit('found', file))
            .on('end', () => {

              end();
            });
        } else {
          em.emit('found', filepath);
          end();
        }
      });
    }
  });

  return em;
}

/**
 * Computes the sha256 of a name using a random salt each time. 
 * @param {string} name 
 * @returns {string}
 */
function shaFileName(name){
  var salt = crypto.randomBytes(64); 
  return crypto.createHash('sha256').update(name+salt).digest('hex');
}

/**
 * Rename all the subdirectories of a given path with the name sha256 value, 
 * and fill the obj with the bijective corrispondence (sha -> name, name -> sha)
 * @param {string} filePath 
 * @param {Object} obj 
 */
function hideNames(filePath, obj={}){
  var file = path.basename(filePath);
  var dir = path.dirname(filePath); 
  var shaName = shaFileName(file); 
  var newPath = path.join(dir, shaName)
  obj[shaName] = file;
  obj[file] = shaName;
  fs.renameSync(filePath, newPath); 
  var stat = fs.statSync(newPath); 
  if(stat.isDirectory()){
    var files = fs.readdirSync(newPath); 
    for(var x of files){
      var newfilePath= path.join(newPath, x); 
      hideNames(newfilePath, obj); 
    }
  }
}

/**
 * Sync function to encrypt names. 
 * @param {string} filePath
 * @returns {string} metadataPath
*/
function encryptNames(filePath){
  var metadata_filenames={};

  hideNames(filePath, metadata_filenames); 
  var newPath = metadata_filenames[filePath]; 
  if(fs.statSync(newPath).isDirectory()){
    var metadataPath = path.join(newPath, METADATA_FILE);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata_filenames, null, 2));
  }else{
    var metadataPath = METADATA_FILE; 
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata_filenames, null, 2));
  }

  return metadataPath; 
}

/**
 * Rename all the subdirectories of a given path with previously stored data in the json metadata obj
 * @param {string} filePath 
 * @param {Object} obj 
 */
function showNames(filePath, obj={}){
  var file = path.basename(filePath);
  var dir = path.dirname(filePath); 
  var realname = obj[file];  
  var newPath = path.join(dir, realname)

  fs.renameSync(filePath, newPath); 
  var stat = fs.statSync(newPath); 
  if(stat.isDirectory()){
    var files = fs.readdirSync(newPath); 
    for(var x of files){
      var newfilePath= path.join(newPath, x); 
      showNames(newfilePath, obj); 
    }
  }
}

/**
 * Function to decrypt files name. It returns the new file path (the one restored). 
 * If it doesn't find the metadata file it returns the file path passed. To restore the files name, 
 * it decrypts the found metadata file and deletes it. If somenthing wrong happens during the metadata file decryption
 * it returns the original file path.  
 * @param {string} filePath 
 * @param {string} key 
 * @param {string} tmp 
 * @returns {string} 
 */
async function decryptNames(filePath, key, tmp){
  var stat = fs.statSync(filePath); 
  var metadata = METADATA_FILE; 

  if(stat.isDirectory()){
    metadata = path.join(filePath, METADATA_FILE); 
  }

  if(fs.existsSync(metadata)){
    try{
      await decryptFile(metadata, key, tmp); 
      const infoObj = JSON.parse(fs.readFileSync(metadata)); 
      fs.unlinkSync(metadata); 
      showNames(filePath, infoObj)
      return infoObj[filePath]; 
    }catch(err){
      return filePath; 
    }

  }else{
    return filePath 
  }

}


module.exports = {
  generateKey,
  encryptStream,
  decryptStream,
  encryptFile,
  decryptFile,
  encryptRecursive,
  decryptRecursive,
  encryptNames, 
  decryptNames, 
  
}