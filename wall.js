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
 * @param {string} file 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const encryptFile = async (file, key) => {
  try {
    const buf = await util.promisify(fs.readFile)(file);
    if (!buf) return true;

    const encrypted = await encrypt(buf, key);

    await util.promisify(fs.writeFile)(file, encrypted);

    return true;
  } catch (e) {
    throw e;
  }
}

/**
 * @param {string} file 
 * @param {string | Buffer | NodeJS.TypedArray | DataView} key 
 */
const decryptFile = async (file, key) => {
  try {
    const buf = await util.promisify(fs.readFile)(file);
    if (!buf) return true;

    const decrypted = await decrypt(buf, key);

    await util.promisify(fs.writeFile)(file, decrypted);

    return true;
  } catch (e) {
    throw e;
  }
}

module.exports = {
  encrypt,
  decrypt,
  encryptFile,
  decryptFile,
}