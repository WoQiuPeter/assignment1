import { runCli } from './cli.js'

runCli().catch(error => {
  console.error(`程序异常：${error.message}`)
  process.exitCode = 1
})
