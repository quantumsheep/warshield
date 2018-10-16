const fs = require('fs');
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
 * 
 * @param {string} original 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @param {boolean} encrypt 
 */
const cipherizeFile = (original, key, encrypt) => new Promise((resolve, reject) => {
  const source = {
    rs: fs.createReadStream(original),
    ws: null,
  }

  if (!source.rs.readable) {
    return reject(false);
  }

  // Generate warshield file id
  const id = crypto.randomBytes(8).toString('hex');
  const targetname = `${original}.${id}.warshield`;

  const target = {
    rs: null,
    ws: fs.createWriteStream(targetname),
  }

  if (!target.ws.writable) {
    return reject(false);
  }

  // Error function
  const ERROR = err => {
    fs.unlink(outFilename, () => { });
    reject(err);
  }

  // Create cipher stream
  const cipher = (encrypt ? encryptStream : decryptStream)(key);
  cipher.on('error', ERROR);

  // Pipe original file into cipher and cipher into warshield file
  const stream = source.rs.pipe(cipher).pipe(target.ws);

  stream.on('finish', () => {
    target.rs = fs.createReadStream(target.ws.path);
    source.ws = fs.createWriteStream(source.rs.path);

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