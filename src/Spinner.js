class Spinner {
  constructor(query = "") {
    this.query = query;
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

    return this;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    return this;
  }
}

module.exports = Spinner;