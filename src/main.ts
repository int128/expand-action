import * as core from '@actions/core'
import { parseOutputs, run } from './run.js'
import { getContext, getOctokit } from './github.js'

const main = async (): Promise<void> => {
  const outputs = await run(
    {
      paths: core.getMultilineInput('paths', { required: true }),
      pathsFallback: core.getMultilineInput('paths-fallback'),
      outputsMap: parseOutputs(core.getMultilineInput('outputs', { required: true })),
    },
    await getContext(),
    getOctokit(),
  )
  for (const [k, v] of outputs.map) {
    core.startGroup(`Set output ${k}`)
    core.setOutput(k, v)
    core.info(v)
    core.endGroup()
  }
}

main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
