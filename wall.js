const fs = require('fs');
const util = require('util');
const crypto = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const MIN_ROUNDS = 3000;
const MAX_ROUNDS = 9000;

/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @param {number} rounds 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} salt 
 */
const generateKey = (key, rounds, salt = null) => new Promise((resolve, reject) => {
  salt = salt || crypto.randomBytes(64);

  crypto.pbkdf2(key, salt, rounds, 32, 'sha512', (err, derivedKey) => {
    if (err) return reject(err);

    resolve([derivedKey, salt]);
  });
});

/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const encryptStream = (key) => {
  const iv = crypto.randomBytes(16);
  const stream = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  return {
    iv,
    stream,
  };
}

/**
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} iv 
 */
const decryptStream = (key, iv) => {
  return crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
}

/**
 * 
 * @param {string} original 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 * @param {boolean} encrypt 
 */
const cipherizeFile = (original, key, encrypt) => new Promise(async (resolve, reject) => {
  // Generate warshield file id
  const id = crypto.randomBytes(8).toString('hex');
  const targetpath = `${original}.${id}.warshield`;

  // Error function
  const ERROR = err => {
    fs.unlink(targetpath, () => { });
    reject(err);
  }

  try {
    if (encrypt) {
      const rounds = Math.floor(Math.random() * (MAX_ROUNDS - MIN_ROUNDS) + MIN_ROUNDS);
      const [derivedKey, salt] = await generateKey(key, rounds);

      // Create cipher stream
      const cipher = encryptStream(derivedKey);
      cipher.stream.on('error', ERROR);

      const source_rs = fs.createReadStream(original).on('error', ERROR);
      const target_ws = fs.createWriteStream(targetpath).on('error', ERROR);

      if (!source_rs.readable || !target_ws.writable) {
        return reject(false);
      }

      // Pipe original file into cipher and cipher into warshield file
      const stream = source_rs.pipe(cipher.stream).pipe(target_ws);

      stream.on('finish', () => {
        decipher.end();
        source_rs.close();
        target_ws.close();

        const target_rs = fs.createReadStream(targetpath).on('error', ERROR);
        const source_ws = fs.createWriteStream(original).on('error', ERROR);

        const tag = cipher.stream.getAuthTag();

        source_ws.write(salt);
        source_ws.write(cipher.iv);
        source_ws.write(tag);
        source_ws.write(Buffer.from(String(rounds)));

        // Pipe warshield file into original file
        target_rs.pipe(source_ws).on('finish', () => {
          fs.unlink(targetpath, () => resolve(true));
        });
      });
    } else {
      const source_rs = fs.createReadStream(original, { end: 100 }).on('error', ERROR);

      if (!source_rs.readable) {
        return reject(false);
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

          const [derivedKey] = await generateKey(key, parseInt(rounds), salt);

          // Create cipher stream
          const decipher = decryptStream(derivedKey, iv).on('error', ERROR);
          decipher.setAuthTag(tag);

          const data_rs = fs.createReadStream(original, { start: 100 }).on('error', ERROR);
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
            const source_ws = fs.createWriteStream(original).on('error', ERROR);

            // Pipe warshield file into original file
            target_rs.pipe(source_ws).on('finish', () => {
              fs.unlink(targetpath, () => resolve(true));
            });
          });
        } catch (e) {
          ERROR(e);
        }
      });
    }
  } catch (e) {
    ERROR(e);
  }
});

module.exports = {
  generateKey,
  cipherizeFile,
}