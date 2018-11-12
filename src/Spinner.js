class Spinner {
  constructor() {
    this.query = "";
    this.timer;
  }

  start() {
    const states = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;

    this.timer = setInterval(() => {
      process.stdout.write(`\u001b[1G\u001b[2K${states[i]} ${this.query}`);

      if (++i >= states.length) {
        i = 0;
      }
    }, 80);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

module.exports = Spinner;