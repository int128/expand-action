import * as core from '@actions/core'
import * as github from '@actions/github'
import { PullRequestEvent } from '@octokit/webhooks-types'
import * as match from './match'

type Inputs = {
  paths: string[]
  pathsFallback: string[]
  outputsMap: Map<string, string>
  token: string
}

type Outputs = {
  map: Map<string, string>
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  core.info(`eventName: ${github.context.eventName}`)
  core.info(`outputs: ${JSON.stringify([...inputs.outputsMap], undefined, 2)}`)

  if (github.context.eventName === 'pull_request') {
    return await handlePullRequest(inputs, github.context.payload as PullRequestEvent)
  }
  core.info(`Fallback to wildcards`)
  return fallbackToWildcard(inputs.outputsMap)
}

const handlePullRequest = async (inputs: Inputs, e: PullRequestEvent): Promise<Outputs> => {
  core.info(`${e.pull_request.changed_files} files are changed in the pull request`)

  // limit the max number of changed files to prevent GitHub API rate limit
  if (e.pull_request.changed_files > 1000) {
    core.info(`Fallback to wildcards due to too many changed files`)
    return fallbackToWildcard(inputs.outputsMap)
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

  if (match.match(inputs.pathsFallback, changedFiles)) {
    core.info(`paths-fallback matches to the changed files`)
    return fallbackToWildcard(inputs.outputsMap)
  }

  core.info(`Transform paths by the changed files`)
  const groups = match.exec(inputs.paths, changedFiles)
  const map = new Map<string, string>()
  for (const [k, v] of inputs.outputsMap) {
    const p = match.transform(v, groups)
    map.set(k, p.join('\n'))
  }
  return { map }
}

const fallbackToWildcard = (outputsMap: Map<string, string>): Outputs => {
  const map = new Map<string, string>()
  for (const [k, v] of outputsMap) {
    const p = match.transformToWildcard(v)
    map.set(k, p.join('\n'))
  }
  return { map }
}

export const parseOutputs = (outputs: string[]): Map<string, string> => {
  const m = new Map<string, string>()
  for (const t of outputs) {
    const i = t.indexOf('=')
    if (i < 0) {
      throw new Error(`outputs must be in form of NAME=PATH but was ${t}`)
    }
    const k = t.substring(0, i)
    const v = t.substring(i + 1)
    m.set(k, v)
  }
  return m
}
