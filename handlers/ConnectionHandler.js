const fs = require('fs'); const path = require('path')
const chokidar = require('chokidar')
const { EventEmitter } = require('events')
const https = require('https')

class ConnectionHandler extends EventEmitter {
  start (path) {
    this._startLockfileWatcher(path)
  }

  async login () {
    this.loginData = await this._waitForConnection()
    console.log('[ConnectionHandler] Player is logged into League of Legends')
    this.loggedIn = true

    this.emit('logged-in', this.loginData)
  }

  hasStarted () {
    return this._lockfileWatcher
  }

  _waitForConnection () {
    const self = this

    function timer (cb, ms = 0) {
      self._sessionCheckTimerId = setTimeout(() => {
        self._checkSession().then(data => {
          if (data) {
            return cb(data)
          }

          timer(cb, 500)
          self.emit('logged-off')
        }).catch(err => {
          if (err.code !== 'ECONNREFUSED' && !err.toString().includes('Couldn\'t get port')) {
            return console.error(err)
          }

          timer(cb, 500)
          self.emit('logged-off')
        })
      }, ms)
    }

    console.log('[ConnectionHandler] Checking session...')
    return new Promise(resolve => timer(data => resolve(data)))
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
        this.loginData = this._lockfile = null

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
        const d = data.split(':')
        resolve({
          pid: d[1],
          port: d[2],
          password: d[3],
          protocol: d[4],
          authToken: 'Basic ' + Buffer.from('riot:' + d[3]).toString('base64'),
          baseUri: `${d[4]}://riot:${d[3]}@127.0.0.1:${d[2]}/`
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
