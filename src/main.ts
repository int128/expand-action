import * as core from '@actions/core'
import { run } from './run'

const main = async (): Promise<void> => {
  try {
    await run({
      paths: core.getMultilineInput('paths', { required: true }),
      pathsAlways: core.getMultilineInput('paths-always'),
      transform: core.getMultilineInput('transform', { required: true }),
      token: core.getInput('token', { required: true }),
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

main()
