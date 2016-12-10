/**
* Provides Daemon interface
*
* @module Dae
* @submodule Daemon
*/
const {EventEmitter} = require('events');
const net = require('net');
const crypto = require('crypto');
const Guest = require('./guest');
const Packet = require('./packet');

// Only for Daemons instanciated by Dae
const {DAE_PID, DAE_PORT, DAE_SECRET} = process.env;

/**
* Returns a port that is not being used by another process.
* @private
* @async
* @param [port] {Numeric} - A number between 1024 && 9999
* @param callback {Function}
*           @param error {Error|null}
*           @param port {Number} - Port that is avaiable
*/
const getAvailablePort = (port, callback) => {
  if (typeof port === 'function') callback = port, port = null;
  if (!port || port < 0 || port < 1024 || port > 9999) port = 1024 + Math.ceil(Math.random() * 8192);
  const testServer = net.createServer();
  testServer
  .once('error', (error) => error.code === 'EADDRINUSE' ? getAvailablePort(port + 1, callback) : callback(error))
  .once('listening', () => testServer.once('close', () => callback(null, port)).close());
  testServer.listen(port);
};

/**
* Daemon class inherited by all daemons. Provides Common TCP interface
* @public
*/
class Daemon extends EventEmitter {
  constructor(props) {
    super();
    const {name} = props;
    const server = net.createServer({allowHalfOpen: false, pauseOnConnect: false});
    const socket = new net.Socket({ fd: undefined, allowHalfOpen: false, readable: false, writable: false });
    Object.defineProperty(this, '_daemon_', {
      configurable: false,
      enumerable: false,
      writeable: false,
      value: { server, socket, name }
    });
    server.on('connection', (socket) => {
      console.log('[CommonTCP] connection', socket.remoteAddress);
      const guest = new Guest(socket);
      guest.on('dae', () => {
        // const credential = {name, pid, port, secret};
        guest.emit('credential', this.name, process.pid, this.port, DAE_SECRET).then(() => guest.socket.end());
      });
      guest.on('options', () => {
        const commands = {};
        Object.keys(guest._events).forEach(eventName => commands[eventName] = guest._events[eventName].length);
        guest.emit('commands', commands);
      });
      this.emit('guest', guest);
    });
    server.on('error', (error) => {
      console.log('[CommonTCP] error', error);
    });
    server.on('close', () => {
      console.log('[CommonTCP] close');
    });
    server.on('listening', () => {
      const address = this._daemon_.address = server.address();
      console.log('[CommonTCP] listening', address.address, address.port);
    });
    getAvailablePort((error, port) => {
      if (error) throw error;
      server.listen(port);
    });
  }
  get port() {
    const {server} = this._daemon_;
    if (!server.listening) return null;
    const address = server.address();
    return address.port;
  }
  get name() {
    return this._daemon_.name;
  }
  getAvailablePort(port) {
    return new Promise((ok, bad) => {
      getAvailablePort(port, (error, port) => {
        if (error) return bad(error);
        ok(port);
      });
    });
  }
}

module.exports = Daemon;
