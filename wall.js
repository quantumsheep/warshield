const fs = require('fs');
const crypto = require('crypto');

// Define a fixed IV to match AES recommendations
// Full Buffer is d0 fd 1a 44 c4 fb ed d1 56 27 3f 85 60 51 0f 1a
const IV = Buffer.from([
  0xd0, 0xfd, 0x1a, 0x44,
  0xc4, 0xfb, 0xed, 0xd1,
  0x56, 0x27, 0x3f, 0x85,
  0x60, 0x51, 0x0f, 0x1a,
]).toString('hex').slice(0, 16);

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const generateKey = key => new Promise((resolve, reject) => {
  crypto.pbkdf2(key, 'salt', 100000, 32, 'sha512', (err, derivedKey) => {
    if (err) return reject(err);

    resolve(derivedKey);
  });
});

/**
 * @param {Buffer} key 
 */
const encryptStream = (key) => {
  return crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, IV);
}

/**
 * @param {Buffer} key 
 */
const decryptStream = (key) => {
  return crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, IV);
}

/**
 * 
 * @param {string} original 
 * @param {Buffer} key 
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
  generateKey,
  encrypt,
  decrypt,
  cipherizeFile,
}