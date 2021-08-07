import * as core from '@actions/core'
import { parseOutputs, run } from './run'

const main = async (): Promise<void> => {
  try {
    const outputs = await run({
      paths: core.getMultilineInput('paths', { required: true }),
      pathsFallback: core.getMultilineInput('paths-fallback'),
      outputsMap: parseOutputs(core.getMultilineInput('outputs', { required: true })),
      token: core.getInput('token', { required: true }),
    })
    for (const [k, v] of outputs.map) {
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
