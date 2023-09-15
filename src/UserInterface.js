const fs = require('fs');
const readline = require('readline');
const cfonts = require('cfonts');
const inquirer = require('inquirer');
const { encrypt, decrypt } = require('./index');

const MODE_DECRYPT = "Decrypt";
const MODE_ENCRYPT = "Encrypt";

function clearScreen() {
  const blank = '\n'.repeat(process.stdout.rows);
  console.log(blank);
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
}

function showHeader() {
  clearScreen();
  cfonts.say('warshield', {
    font: 'block',
    align: 'center',
    colors: ['system']
  });
}

async function askHideNames() {
  showHeader();
  return inquirer.prompt({
    name: 'hide',
    type: 'list',
    message: 'Do you also want to encrypt your files name?',
    choices: ['Yes', 'No'],
    default: 'Yes'
  }).then((input) => {
    return input.hide;
  })
}

async function askMode() {
  showHeader();
  return inquirer.prompt({
    name: 'mode',
    type: 'list',
    message: 'What you want to do ?',
    choices: [MODE_ENCRYPT, MODE_DECRYPT],
    default: MODE_ENCRYPT
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
    choices: ['verbose', 'trace errors'],
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
  const options = {verbose: false, trace: false, tmp: false, hide: true };
  const mode = await askMode();
  const enabledOptions = await askOptions();
  options.verbose = enabledOptions.includes('verbose');
  options.trace = enabledOptions.includes('trace errors');
  const file = await askFile();

  if (mode === MODE_DECRYPT) {
    showHeader();
    await decrypt(file, options)
  }
  else {
    const hide = await askHideNames();
    if(hide === 'No'){
      options.hide=false; 
    }
    showHeader()
    await encrypt(file, options)
  }
}

module.exports = showUI;