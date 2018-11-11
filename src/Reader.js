const readline = require('readline');

class Reader {
  constructor() {
    this.prompt = true;

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this._show = this.rl._writeToOutput;
  }

  /**
   * @param {string} stringToWrite 
   */
  _hide(stringToWrite) {
    if (!this.hide) {
      this.output.write(`\u001b[1G\u001b[2K${this._prompt}`);
    } else {
      this.output.write(stringToWrite);
      this.hide = false;
    }
  }

  /**
   * @param {string} prompt 
   * @param {boolean} hide 
   * @returns {Promise<string>} 
   */
  read(prompt, hide) {
    return new Promise(resolve => {
      if (hide) {
        this.rl._writeToOutput = this._hide;
      } else {
        this.rl._writeToOutput = this._show;
      }

      this.rl.question(prompt, resolve);
    });
  }
}

module.exports = Reader;