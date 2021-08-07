import * as core from '@actions/core'
import * as github from '@actions/github'
import * as match from './match'

type Inputs = {
  paths: string[]
  pathsAlways: string[]
  transform: string[]
  token: string
}

type Outputs = {
  variables: Map<string, string>
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  if (github.context.eventName !== 'pull_request') {
    core.info(`Received event ${github.context.eventName} and transform paths to wildcards`)
    return fallbackToWildcard(inputs)
  }
  return await handlePullRequest(inputs)
}

const handlePullRequest = async (inputs: Inputs): Promise<Outputs> => {
  const octokit = github.getOctokit(inputs.token)
  //TODO: paginate
  core.info(`List files in the current pull request`)
  const { data: listFiles } = await octokit.rest.pulls.listFiles({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: github.context.issue.number,
    per_page: 100,
  })

  const changedFiles = listFiles.map((f) => f.filename)

  if (match.match(inputs.pathsAlways, changedFiles)) {
    core.info(`paths-always matches to the changed files`)
    return fallbackToWildcard(inputs)
  }

  core.info(`Transform paths`)
  const transform = parseTransform(inputs.transform)
  const groups = match.exec(inputs.paths, changedFiles)
  const outputVariables = new Map<string, string>()
  for (const [k, v] of transform) {
    const p = match.transform(v, groups)
    outputVariables.set(k, p.join('\n'))
  }
  return { variables: outputVariables }
}

const fallbackToWildcard = (inputs: Inputs): Outputs => {
  const transform = parseTransform(inputs.transform)
  const outputVariables = new Map<string, string>()
  for (const [k, v] of transform) {
    const p = match.transformToWildcard(v)
    outputVariables.set(k, p.join('\n'))
  }
  return { variables: outputVariables }
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
  core.info(`Parsed transform as\n${[...m].map(([k, v]) => `${k} => ${v}`).join('\n')}`)
  return m
}
