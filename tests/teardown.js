/* globals  */
const { exec } = require('child_process')
const { promisify } = require('util')
const execP = promisify(exec)

module.exports = async () => {
  const search = '[l]ocal-dynamo'
  let cmd = `ps aux | grep "${search}" | awk '{print $2}' `
  console.log('...find dynamo svc')
  console.log(cmd)
  const r = await execP(cmd)

  console.log('...found on PID:', r)
  cmd = `kill ${r.stdout.toString().trim()}`
  console.log(cmd)
  await execP(cmd)
}
