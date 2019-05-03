const fs = require('fs');
const readline = require('readline');
const cfonts = require('cfonts');
const inquirer = require('inquirer');
const { encrypt, decrypt } = require('./index');

let clearScreen = () => {
  const blank = '\n'.repeat(process.stdout.rows);
  console.log(blank);
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
}

let showHeader = () => {
  clearScreen();
  cfonts.say('warshield', {
    font: 'block',
    align: 'center',
    colors: ['system']
  });
}

async function askMode() {
  showHeader();
  return inquirer.prompt({
    name: 'mode',
    type: 'list',
    message: 'What you want to do ?',
    choices: ['Encrypt', 'Decrypt'],
    default: 'Encrypt'
  }).then((input) => {
    return input.mode;
  })
}

async function askOptions() {
  showHeader();
  return inquirer.prompt({
    name: 'options',
    type: 'checkbox',
    message: 'Choose options you want to enable:',
    choices: ['verbose', 'trace'],
    default: 'Encrypt'
  }).then((input) => {
    return input.options;
  })
}

async function askFile() {
  showHeader();
  return inquirer.prompt({
    name: 'path',
    type: 'list',
    message: 'Select a file or directory:',
    choices: fs.readdirSync(process.cwd()),
    pageSize: 20
  }).then(input => {
    return input.path;
  })
}

async function showUI() {
  let options = { parent: { verbose: false, trace: false, tmp: false } };
  const mode = await askMode();
  const enabledOptions = await askOptions();
  options.parent.verbose = enabledOptions.includes('verbose');
  options.parent.trace = enabledOptions.includes('trace');
  const file = await askFile();
  showHeader();
  mode === 'Decrypt' ? await decrypt(file, options) : await encrypt(file, options);
}

module.exports = showUI;