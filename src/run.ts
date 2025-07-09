import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as match from './match.js'
import * as path from 'path'
import { Context } from './github.js'
import { Octokit } from '@octokit/action'

type Inputs = {
  paths: string[]
  pathsFallback: string[]
  outputsMap: Map<string, string>
  outputsEncoding: OutputsEncoding
  expandWildcard: boolean
}

type OutputsEncoding = 'multiline' | 'json'

type Outputs = {
  map: Map<string, string>
}

export const run = async (inputs: Inputs, context: Context, octokit: Octokit): Promise<Outputs> => {
  core.info(`eventName: ${context.eventName}`)
  core.info(`outputs: ${JSON.stringify([...inputs.outputsMap], undefined, 2)}`)

  const variableMap = await matchChangedFiles(inputs, context, octokit)
  const map = new Map<string, string>()
  for (const [key, paths] of variableMap) {
    map.set(key, await encodeOutputValue(paths, inputs.outputsEncoding, inputs.expandWildcard))
  }
  return { map }
}

const encodeOutputValue = async (
  paths: string[],
  encoding: OutputsEncoding,
  expandWildcard: boolean,
): Promise<string> => {
  if (expandWildcard) {
    paths = await expandOutputPaths(paths)
  }
  if (encoding === 'json') {
    return JSON.stringify(paths)
  }
  return paths.join('\n')
}

const expandOutputPaths = async (paths: string[]): Promise<string[]> => {
  const globber = await glob.create(paths.join('\n'), { followSymbolicLinks: false, matchDirectories: false })
  const expandedPaths: string[] = []
  for await (const fullPath of globber.globGenerator()) {
    const relativePath = path.relative(process.cwd(), fullPath)
    expandedPaths.push(relativePath)
  }
  return expandedPaths
}

type VariableMap = Map<string, string[]>

const matchChangedFiles = async (inputs: Inputs, context: Context, octokit: Octokit): Promise<VariableMap> => {
  if (!('pull_request' in context.payload && 'number' in context.payload)) {
    core.info(`Fallback to wildcard because not pull_request event`)
    return fallbackToWildcard(inputs.outputsMap)
  }

  // Limit the max number of changed files to prevent GitHub API rate limit
  core.info(`${context.payload.pull_request.changed_files} files are changed in the pull request`)
  if (context.payload.pull_request.changed_files > 1000) {
    core.info(`Fallback to wildcards due to too many changed files`)
    return fallbackToWildcard(inputs.outputsMap)
  }

  core.info(`List files in the pull request`)
  const listFiles = await octokit.paginate(
    octokit.rest.pulls.listFiles,
    {
      owner: context.payload.pull_request.base.repo.owner.login,
      repo: context.payload.pull_request.base.repo.name,
      pull_number: context.payload.pull_request.number,
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
  const variableMap = new Map<string, string[]>()
  for (const [key, pattern] of inputs.outputsMap) {
    const paths = match.transform(pattern, groups)
    variableMap.set(key, paths)
  }
  return variableMap
}

const fallbackToWildcard = (outputsMap: Map<string, string>): VariableMap => {
  const variableMap = new Map<string, string[]>()
  for (const [key, pattern] of outputsMap) {
    const paths = match.transformToWildcard(pattern)
    variableMap.set(key, paths)
  }
  return variableMap
}
