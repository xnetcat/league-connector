const fs = require('fs'); const path = require('path')
const chokidar = require('chokidar')
const { EventEmitter } = require('events')
const https = require('https')

class ConnectionHandler extends EventEmitter {
  start (path) {
    this._startLockfileWatcher(path)
  }

  hasStarted () {
    return this._lockfileWatcher
  }

  end () {
    if (this._lockfileWatcher) {
      this._endLockfileWatcher()
    }

    if (this._sessionCheckTimerId) {
      clearTimeout(this._sessionCheckTimerId)
    }
  }

  getLockfile () {
    return this._lockfile
  }

  _startLockfileWatcher (leaguePath) {
    const self = this
    async function check (path) {
      console.log('[ConnectionHandler] League of Legends connection data detected')
      console.log('[ConnectionHandler] Reading connection file')

      try {
        const lockfile = await self._readLockfile(leaguePath)
        const isOutdated = await self._isLockFileOutdated(lockfile)

        if (isOutdated) {
          return console.log('[ConnectionHandler] Lockfile is outdated, has League of Legends crashed?')
        }

        console.log('[ConnectionHandler] Connected to League of Legends!')

        self.connected = true
        self._lockfile = lockfile
        self.emit('connected', lockfile)
      } catch (err) {
        console.error(err)
      }
    }

    this._lockfileWatcher = chokidar.watch(path.join(leaguePath, 'lockfile'), { disableGlobbing: true })
      .on('add', check)
      .on('change', check)
      .on('unlink', () => {
        console.log('[ConnectionHandler] Connection to League has ended')

        this.connected = false

        this.emit('disconnected')
      })
  }

  _endLockfileWatcher () {
    this._lockfileWatcher.close()
  }

  _checkSession () {
    if (!this._lockfile || !this._lockfile.port) {
      return Promise.reject(Error('Couldn\'t get port'))
    }

    const token = this._getAuthenticationToken()
    const port = this._lockfile.port

    return new Promise((resolve, reject) => {
      https.get({
        host: '127.0.0.1',
        port: port,
        path: '/lol-summoner/v1/current-summoner',
        headers: {
          Authorization: token
        },
        rejectUnauthorized: false
      }, res => {
        if (res.statusCode === 200) {
          let body = ''

          res.on('data', chunk => { body += chunk })
          res.on('end', () => resolve(JSON.parse(body)))
        }
      }).on('error', err => reject(err))
    })
  }

  _getAuthenticationToken () {
    return this._lockfile.authToken
  }

  _readLockfile (leaguePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(leaguePath, 'lockfile'), 'utf8', (err, data) => {
        if (err) {
          return reject(err)
        }

        const [, pid, port, password, protocol] = data.split(':')
        resolve({
          pid: pid,
          port: port,
          password: password,
          protocol: protocol,
          authToken: 'Basic ' + Buffer.from('riot:' + password).toString('base64'),
          baseUri: `${protocol}://riot:${password}@127.0.0.1:${port}/`
        })
      })
    })
  }

  _isLockFileOutdated (lockfile) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        https.get({
          host: '127.0.0.1',
          port: lockfile.port,
          headers: {
            Authorization: lockfile.authToken
          },
          rejectUnauthorized: false
        }, res => {
          if (res.statusCode === 404) {
            resolve(false)
          } else {
            resolve(true)
          }
        }).on('error', err => {
          reject(err)
        })
      }, 1000)
    })
  }
}

module.exports = ConnectionHandler
