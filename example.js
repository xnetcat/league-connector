const LeagueConnector = require('league-connector')
const https = require('https')
const instance = new LeagueConnector()

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

instance.load().then(() => {
  instance.start()
  console.log('[Test] Started LeagueConnector')

  instance.getConnectionHandler().on('connected', data => {
    https.get(`${data.baseUri}lol-summoner/v1/current-summoner`, (resp) => {
      let data = ''

      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk
      })

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        console.log(data)
      })
    }).on('error', (err) => {
      console.log('Error: ' + err.message)
    })
  })
}).catch(err => {
  console.error(err)
})
