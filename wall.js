const fs = require('fs');
const util = require('util');
const crypto = require('crypto');

/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} text 
 */
const md5 = text => crypto.createHash('md5').update(text).digest();

/**
 * @param {Buffer} buf 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const encrypt = (buf, key) => {
  key = md5(key);
  key = Buffer.concat([key, key.slice(0, 8)]); // properly expand 3DES key from 128 bit to 192 bit

  const cipher = crypto.createCipheriv('des-ede3', key, '');
  const encrypted = Buffer.concat([cipher.update(buf), cipher.final()]);

  return encrypted;
}

/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const encryptStream = (key) => {
  key = md5(key);
  key = Buffer.concat([key, key.slice(0, 8)]); // properly expand 3DES key from 128 bit to 192 bit

  return crypto.createCipheriv('des-ede3', key, '');
}

/**
 * @param {Buffer} buf 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const decrypt = (buf, key) => {
  key = md5(key);
  key = Buffer.concat([key, key.slice(0, 8)]); // properly expand 3DES key from 128 bit to 192 bit

  const decipher = crypto.createDecipheriv('des-ede3', key, '');
  const decrypted = Buffer.concat([decipher.update(buf), decipher.final()]);
  return decrypted;
}

/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const decryptStream = (key) => {
  key = md5(key);
  key = Buffer.concat([key, key.slice(0, 8)]); // properly expand 3DES key from 128 bit to 192 bit

  return crypto.createDecipheriv('des-ede3', key, '');
}

/**
 * @param {string} file 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const encryptFile = (file, key) => new Promise((resolve, reject) => {
  // Create original file read stream
  const r = fs.createReadStream(file);
  if (!r.readable) return resolve(false);

  // Generate warshield filename
  const rand = crypto.randomBytes(4).toString('hex');
  const outFilename = `${file}.${rand}.warshield`;

  // Create warshield file write stream
  const outw = fs.createWriteStream(outFilename);

  // Pipe original file into cipher and cipher into warshield file
  const stream = r.pipe(encryptStream(key)).pipe(outw);

  stream.on('finish', () => {
    // Create warshield file read stream
    const outr = fs.createReadStream(outFilename);

    // Create original file write stream
    const w = fs.createWriteStream(file);

    // Pipe warshield file into original file
    outr.pipe(w).on('finish', () => {
      // Delete warshield file
      fs.unlink(outFilename, () => resolve(true));
    });
  });
});

/**
 * @param {string} file 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const decryptFile = (file, key) => new Promise((resolve, reject) => {
  // Create original file read stream
  const r = fs.createReadStream(file);
  if (!r.readable) return resolve(false);

  // Generate warshield filename
  const rand = crypto.randomBytes(4).toString('hex');
  const outFilename = `${file}.${rand}.warshield`;

  // Create warshield file write stream
  const outw = fs.createWriteStream(outFilename);

  // Pipe original file into cipher and cipher into warshield file
  const stream = r.pipe(decryptStream(key)).pipe(outw);

  stream.on('finish', () => {
    // Create warshield file read stream
    const outr = fs.createReadStream(outFilename);

    // Create original file write stream
    const w = fs.createWriteStream(file);

    // Pipe warshield file into original file
    outr.pipe(w).on('finish', () => {
      // Delete warshield file
      fs.unlink(outFilename, () => resolve(true));
    });
  });
});

module.exports = {
  encrypt,
  decrypt,
  encryptFile,
  decryptFile,
}