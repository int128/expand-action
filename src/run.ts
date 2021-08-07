import * as core from '@actions/core'
import * as github from '@actions/github'
import * as match from './match'

type Inputs = {
  paths: string[]
  pathsAlways: string[]
  transform: string[]
  token: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  if (github.context.eventName !== 'pull_request') {
    return fallbackToWildcard(inputs)
  }
  return await handlePullRequest(inputs)
}

const handlePullRequest = async (inputs: Inputs): Promise<void> => {
  const transform = parseTransform(inputs.transform)
  core.info(`Parsed transform as\n${[...transform.entries()].map(([k, v]) => `${k} => ${v}`).join('\n')}`)

  const octokit = github.getOctokit(inputs.token)
  //TODO: paginate
  core.info(`List files in the current pull request`)
  const { data: listFiles } = await octokit.rest.pulls.listFiles({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: github.context.issue.number,
    per_page: 100,
  })

  const files = listFiles.map((f) => f.filename)

  if (match.match(inputs.pathsAlways, files)) {
    core.info(`Transform paths to wildcards because paths-always were matched`)
    for (const [outputKey, pattern] of transform.entries()) {
      const t = match.transformToWildcard(pattern)
      core.setOutput(outputKey, t.join('\n'))
      core.startGroup(`Set output ${outputKey}`)
      core.info(t.join('\n'))
      core.endGroup()
    }
    return
  }

  core.info(`Transform paths`)
  const groups = match.exec(inputs.paths, files)
  for (const [outputKey, pattern] of transform.entries()) {
    const t = match.transform(pattern, groups)
    core.setOutput(outputKey, t.join('\n'))
    core.startGroup(`Set output ${outputKey}`)
    core.info(t.join('\n'))
    core.endGroup()
  }
}

const fallbackToWildcard = (inputs: Inputs): void => {
  core.info(`Transform paths to wildcards due to event ${github.context.eventName}`)

  const transform = parseTransform(inputs.transform)
  core.info(`Parsed transform as\n${[...transform.entries()].map(([k, v]) => `${k} => ${v}`).join('\n')}`)

  for (const [outputKey, pattern] of transform.entries()) {
    const t = match.transformToWildcard(pattern)
    core.setOutput(outputKey, t.join('\n'))
    core.startGroup(`Set output ${outputKey}`)
    core.info(t.join('\n'))
    core.endGroup()
  }
}

const parseTransform = (transform: string[]): Map<string, string> => {
  const m = new Map<string, string>()
  for (const t of transform) {
    const i = t.indexOf('=')
    if (i < 0) {
      throw new Error(`transform must be in form of KEY=PATTERN but was ${t}`)
    }
    const k = t.substring(0, i)
    const v = t.substring(i + 1)
    m.set(k, v)
  }
  return m
}
