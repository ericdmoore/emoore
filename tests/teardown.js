/* globals  */
const { exec } = require('child_process')
const { promisify } = require('util')
const execP = promisify(exec)

const main = async () => {
  const search = '[l]ocal-dynamo'
  let cmd = `ps aux | grep "${search}" | awk '{print $2}' `
  console.log('...find dynamo svc')
  console.log(cmd)
  const r = await execP(cmd).catch(console.error)

  const pid = r.stdout.toString().trim()
  if (pid.length > 0) {
    console.log('...found svc on PID:', pid)
    console.log(`tearing down local dynamo service - kill:${pid}`)
    cmd = `kill ${pid}`
    await execP(cmd)
  } else {
    console.log('> no PID found for the local dynamo svc')
  }
  console.log('\n\n\n')
  return null
}

module.exports = main

;(async () => {
  if (!module.parent) {
    console.log('independent run')

    const value = await new Promise(() => {})
    console.log({ value })

    await main().catch(console.error)
  }
})()
