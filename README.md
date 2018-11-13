![Warshield](https://i.imgur.com/hmaHsmi.png)

[WarShield](https://warshield.qtmsheep.com) is a CLI tool made to cipher and decipher your files with a password using AES-256. It was made to ensure a full files protection inside a storage device. If those are lost or stolen, malicious peoples can take over your data.

It uses AES-256 GCM (Galois/Counter Mode) with random 16 bytes initialization vector.
Key is hash in a 256 bits key with SHA-512 using random 64 bytes salt and rounds (between 3000 and 9000 rounds).


# How to install
`npm install -g warshield`

# How to use
```
Usage: warshield [options] <mode> <dir>

Options:
  -V, --version             output the version number
  -v, --verbose             enable verbosity
  -v, --verbose             enable stacktrace
  -h, --help                output usage information

Commands:
  encrypt <file> [options]  encrypt a file or all files in a directory
  decrypt <file> [options]  decrypt a file or all files in a directory
```