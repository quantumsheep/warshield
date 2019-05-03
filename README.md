![Warshield](https://i.imgur.com/hmaHsmi.png)

![license](https://img.shields.io/github/license/quantumsheep/warshield.svg)
[![npm](https://img.shields.io/npm/v/warshield/latest.svg)](https://www.npmjs.com/package/warshield)

[WarShield](https://warshield.qtmsheep.com) is a CLI tool made to encrypt and decrypt your files with a password using AES-256. It was made to ensure a full files protection inside a storage device. If those are lost or stolen, malicious peoples can take over your data.

It uses AES-256 GCM (Galois/Counter Mode) with random 16 bytes initialization vector.
Key is hash in a 256 bits key with SHA-512 using random 64 bytes salt and rounds (between 3000 and 9000 rounds).


# How to install
NodeJS minimal required version is `v10.0.0`.  
To install as a CLI tool, launch `npm install -g warshield`.

# How to use
```
Usage: warshield [options] <mode> <dir>

Options:
  -V, --version             output the version number
  -v, --verbose             enable verbosity
  -t, --trace               enable stacktrace
  -p, --tmp <directory>     change temporary directory
  -h, --help                output usage information

Commands:
  encrypt [options] <file>  encrypt a file or all files in a directory
  decrypt [options] <file>  decrypt a file or all files in a directory
```
