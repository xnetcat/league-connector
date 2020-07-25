const { access, constants } = require('fs')
const path = require('path')
const { exec } = require('child_process')

class PathHandler {
  async load () {
    if ((this._leaguePath = await this._findLeaguePath()) === null) {
      throw Error("Couldn't find League of Legends path. Please start the client.")
    }
  }

  getLeaguePath () {
    return this._leaguePath
  }

  setLeaguePath (path) {
    this._leaguePath = path
    return path
  }

  async isConnectedtoLeague () {
    return await this._getLeaguePathByCommandLine() !== false
  }

  async _findLeaguePath () {
    console.log('[PathHandler] Trying to find path.')

    for (const x of ['C:\\Riot Games\\League of Legends\\', '/Applications/League of Legends.app/Contents/LoL/']) {
      if (await this._exists(path.resolve(x + '\\LeagueClient.' + this._getExtensionByPlatform(process.platform)))) {
        return x
      }
    }

    try {
      const leaguePath = await this._getLeaguePathByCommandLine()
      console.log(`[PathHandler] Path found: ${leaguePath}`)

      return leaguePath
    } catch (err) {
      console.log(err)
      return null
    }
  }

  async _getLeaguePathByCommandLine () {
    const command = process.platform === 'win32' ? "WMIC.exe PROCESS WHERE name='LeagueClient.exe' GET ExecutablePath" : "ps x -o args | grep 'LeagueClient'"

    return new Promise((resolve, reject) => {
      exec(command, process.platform === 'win32' ? {
        shell: 'C:\\WINDOWS\\system32\\cmd.exe',
        cwd: 'C:\\Windows\\System32\\wbem\\'
      } : {}, function (error, stdout) {
        if (error) {
          return reject(error)
        }

        const matches = stdout.match(/[^\n]+?(?=RADS)/gm)
        if (!matches || matches.length === 0) {
          const normalizedPath = path.normalize(stdout)
          const LCUDir = path.dirname(process.platform ? normalizedPath.split(/\n|\n\r/)[1] : normalizedPath)
          if (!LCUDir || LCUDir.length === 0) {
            reject(new Error(`Path not found, LCUDir: ${LCUDir}`))
          } else {
            resolve(LCUDir)
          }
        } else {
          if (!matches || matches.length === 0) {
            reject(new Error(`Path not found, matches: ${matches}`))
          }
          resolve(matches[0])
        }
      })
    })
  }

  _exists (path) {
    return new Promise((resolve, reject) => {
      access(path, constants.F_OK, err => {
        if (err) {
          return reject(err)
        } else {
          resolve(true)
        }
      })
    })
  }

  _getExtensionByPlatform (platform) {
    if (platform === 'darwin') {
      return 'app'
    }
    return 'exe'
  }
}

module.exports = PathHandler
