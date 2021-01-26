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
      exec(command, function (error, stdout) {
        if (error) {
          return reject(error)
        }

        const matches = stdout.match(/[^\n]+?(?=LeagueClient)/gm)
        if (matches) {
          const normalizedPath = path.normalize(stdout)
          const LCUDir = path.dirname(process.platform === 'win32' ? normalizedPath.split(/\n|\n\r/)[1] : normalizedPath)
          if (LCUDir) {
            resolve(LCUDir)
          } else {
            reject(new Error('Path not found'))
          }
        } else {
          reject(new Error('Path not found'))
        }
      })
    })
  }
}

module.exports = PathHandler
