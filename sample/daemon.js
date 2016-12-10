/**
* Sample - A Daemon that serves as shared memory for other Daemons
*/
const {Daemon} = require('..');

class Sample extends Daemon {
  constructor(props) {
    super({name: 'Sample'});
    this.reset();
    this.on('guest', (guest) => {
      guest.on('memory', () => guest.emit('memory', this.memory));
      guest.on('set', (key, value) => this.memory[key] = value);
      guest.on('get', (key) => guest.emit(key, this.memory[key]));
      guest.on('reset', () => this.reset());
    });
  }
  reset() {
    this.memory = {};
  }
}

if (process.env.DAE) {
  const delta = new Sample();
} else {
  module.exports = Sample;
}
