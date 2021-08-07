import * as core from '@actions/core'
import * as github from '@actions/github'
import { PullRequestEvent } from '@octokit/webhooks-types'
import * as match from './match'

type Inputs = {
  paths: string[]
  pathsAlways: string[]
  transform: Transform
  token: string
}

type Outputs = {
  variables: Map<string, string>
}

type Transform = Map<string, string>

export const run = async (inputs: Inputs): Promise<Outputs> => {
  core.info(`eventName: ${github.context.eventName}`)
  core.info(`transform: ${JSON.stringify([...inputs.transform], undefined, 2)}`)

  if (github.context.eventName === 'pull_request') {
    return await handlePullRequest(inputs, github.context.payload as PullRequestEvent)
  }
  core.info(`Fallback to wildcards`)
  return fallbackToWildcard(inputs.transform)
}

const handlePullRequest = async (inputs: Inputs, e: PullRequestEvent): Promise<Outputs> => {
  core.info(`${e.pull_request.changed_files} files are changed in the pull request`)

  // limit the max number of changed files to prevent GitHub API rate limit
  if (e.pull_request.changed_files > 1000) {
    core.info(`Fallback to wildcards due to too many changed files`)
    return fallbackToWildcard(inputs.transform)
  }

  core.info(`List files in the pull request`)
  const octokit = github.getOctokit(inputs.token)
  const listFiles = await octokit.paginate(
    octokit.rest.pulls.listFiles,
    {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: github.context.issue.number,
      per_page: 100,
    },
    (r) => r.data
  )
  const changedFiles = listFiles.map((f) => f.filename)
  core.info(`Received a list of ${changedFiles.length} files`)

  if (match.match(inputs.pathsAlways, changedFiles)) {
    core.info(`paths-always matches to the changed files`)
    return fallbackToWildcard(inputs.transform)
  }

  core.info(`Transform paths by the changed files`)
  const groups = match.exec(inputs.paths, changedFiles)
  const outputVariables = new Map<string, string>()
  for (const [k, v] of inputs.transform) {
    const p = match.transform(v, groups)
    outputVariables.set(k, p.join('\n'))
  }
  return { variables: outputVariables }
}

const fallbackToWildcard = (transform: Map<string, string>): Outputs => {
  const outputVariables = new Map<string, string>()
  for (const [k, v] of transform) {
    const p = match.transformToWildcard(v)
    outputVariables.set(k, p.join('\n'))
  }
  return { variables: outputVariables }
}

export const parseTransform = (transform: string[]): Transform => {
  const m = new Map<string, string>()
  for (const t of transform) {
    const i = t.indexOf('=')
    if (i < 0) {
      throw new Error(`transform must be in form of NAME=PATTERN but was ${t}`)
    }
    const k = t.substring(0, i)
    const v = t.substring(i + 1)
    m.set(k, v)
  }
  return m
}
