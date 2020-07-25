const { EventEmitter } = require('events')

class LeagueConnector extends EventEmitter {
  constructor () {
    super()
    this.connectionHandler = new (require('./handlers/ConnectionHandler'))()
    this.pathHandler = new (require('./handlers/PathHandler'))()
  }

  async load () {
    return await this.pathHandler.load()
  }

  start (path = this.pathHandler.getLeaguePath()) {
    return this.connectionHandler.start(path)
  }

  end () {
    this.connectionHandler.end()
  }

  getPath () {
    return this.pathHandler.getLeaguePath()
  }

  getPathHandler () {
    return this.pathHandler
  }

  getConnectionHandler () {
    return this.connectionHandler
  }

  isConnected () {
    return this.connectionHandler.connected
  }

  getLoginData () {
    return this.connectionHandler.loginData
  }
}

module.exports = LeagueConnector
