const fs = require('fs');
const crypto = require('crypto');

/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} text 
 */
const md5 = text => crypto.createHash('md5').update(text).digest();

/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const generateKey = (key) => {
  key = md5(key);
  key = Buffer.concat([key, key.slice(0, 8)]); // properly expand 3DES key from 128 bit to 192 bit

  return key;
}

/**
 * @param {Buffer} buf 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const encrypt = (buf, key) => {
  key = md5(key);
  key = Buffer.concat([key, key.slice(0, 8)]); // properly expand 3DES key from 128 bit to 192 bit

  const cipher = crypto.createCipher('aes-256-ctr', key);
  const encrypted = Buffer.concat([cipher.update(buf), cipher.final()]);

  return encrypted;
}

/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const encryptStream = (key) => {
  key = md5(key);
  key = Buffer.concat([key, key.slice(0, 8)]); // properly expand 3DES key from 128 bit to 192 bit

  return crypto.createCipher('aes-256-ctr', key);
}

/**
 * @param {Buffer} buf 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const decrypt = (buf, key) => {
  key = generateKey(key);

  const decipher = crypto.createDecipher('aes-256-ctr', key);
  const decrypted = Buffer.concat([decipher.update(buf), decipher.final()]);
  return decrypted;
}

/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const decryptStream = (key) => {
  key = generateKey(key);

  return crypto.createDecipher('aes-256-ctr', key);
}

/**
 * 
 * @param {string} original 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @param {boolean} encrypt 
 */
const cipherizeFile = (original, key, encrypt) => new Promise((resolve, reject) => {
  // Generate warshield file id
  const id = crypto.randomBytes(8).toString('hex');
  const targetname = `${original}.${id}.warshield`;

  // Error function
  const ERROR = err => {
    fs.unlink(targetname, () => { });
    reject(err);
  }

  const source = {
    rs: fs.createReadStream(original).on('error', ERROR),
    ws: null,
  }

  if (!source.rs.readable) {
    return reject(false);
  }

  const target = {
    rs: null,
    ws: fs.createWriteStream(targetname).on('error', ERROR),
  }

  if (!target.ws.writable) {
    return reject(false);
  }

  // Create cipher stream
  const cipher = (encrypt ? encryptStream : decryptStream)(key);
  cipher.on('error', ERROR);

  // Pipe original file into cipher and cipher into warshield file
  const stream = source.rs.pipe(cipher).pipe(target.ws);

  stream.on('finish', () => {
    target.rs = fs.createReadStream(target.ws.path).on('error', ERROR);
    source.ws = fs.createWriteStream(source.rs.path).on('error', ERROR);

    // Pipe warshield file into original file
    target.rs.pipe(source.ws).on('finish', () => {
      fs.unlink(target.ws.path, () => resolve(true));
    });
  });
});

module.exports = {
  encrypt,
  decrypt,
  cipherizeFile,
}