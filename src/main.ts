import * as core from '@actions/core'
import { parseTransform, run } from './run'

const main = async (): Promise<void> => {
  try {
    const outputs = await run({
      paths: core.getMultilineInput('paths', { required: true }),
      pathsAlways: core.getMultilineInput('paths-always'),
      transform: parseTransform(core.getMultilineInput('transform', { required: true })),
      token: core.getInput('token', { required: true }),
    })
    for (const [k, v] of outputs.variables) {
      core.startGroup(`Set output ${k}`)
      core.setOutput(k, v)
      core.info(v)
      core.endGroup()
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

main()
