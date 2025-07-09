import * as core from '@actions/core'
import { PullRequestEvent } from '@octokit/webhooks-types'
import * as match from './match.js'
import { Context } from './github.js'
import { Octokit } from '@octokit/action'

type Inputs = {
  paths: string[]
  pathsFallback: string[]
  outputsMap: Map<string, string>
}

type Outputs = {
  map: Map<string, string>
}

export const run = async (inputs: Inputs, context: Context, octokit: Octokit): Promise<Outputs> => {
  core.info(`eventName: ${context.eventName}`)
  core.info(`outputs: ${JSON.stringify([...inputs.outputsMap], undefined, 2)}`)

  if ('pull_request' in context.payload && 'number' in context.payload) {
    return await handlePullRequest(inputs, context.payload, octokit)
  }
  core.info(`Fallback to wildcards`)
  return fallbackToWildcard(inputs.outputsMap)
}

const handlePullRequest = async (inputs: Inputs, e: PullRequestEvent, octokit: Octokit): Promise<Outputs> => {
  core.info(`${e.pull_request.changed_files} files are changed in the pull request`)

  // limit the max number of changed files to prevent GitHub API rate limit
  if (e.pull_request.changed_files > 1000) {
    core.info(`Fallback to wildcards due to too many changed files`)
    return fallbackToWildcard(inputs.outputsMap)
  }

  core.info(`List files in the pull request`)
  const listFiles = await octokit.paginate(
    octokit.rest.pulls.listFiles,
    {
      owner: e.pull_request.base.repo.owner.login,
      repo: e.pull_request.base.repo.name,
      pull_number: e.pull_request.number,
      per_page: 100,
    },
    (r) => r.data,
  )
  const changedFiles = listFiles.map((f) => f.filename)
  core.info(`Received a list of ${changedFiles.length} files`)

  if (match.matchAny(inputs.pathsFallback, changedFiles)) {
    core.info(`Fallback to wildcard because paths-fallback matches to the changed files`)
    return fallbackToWildcard(inputs.outputsMap)
  }

  const groups = match.matchGroups(inputs.paths, changedFiles)
  if (groups.length === 0) {
    core.info(`Fallback to wildcard because paths did not match to any changed files`)
    return fallbackToWildcard(inputs.outputsMap)
  }

  core.info(`Transform paths by the changed files`)
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
