import { createHash } from 'crypto'

export type Groups = { [key: string]: string | undefined }

export const matchAny = (patterns: string[], changedFiles: string[]): boolean => {
  const regexps = patterns.map(compilePathToRegexp)
  for (const changedFile of changedFiles) {
    for (const re of regexps) {
      if (re.test(changedFile)) {
        return true
      }
    }
  }
  return false
}

export const matchGroups = (patterns: string[], changedFiles: string[]): Groups[] => {
  const regexps = patterns.map(compilePathToRegexp)
  const groupsSet = new Map<string, Groups>()
  for (const changedFile of changedFiles) {
    for (const re of regexps) {
      const matcher = re.exec(changedFile)
      if (matcher?.groups !== undefined) {
        const dedupeKey = computeKeyOfGroups(matcher.groups)
        groupsSet.set(dedupeKey, matcher.groups)
      }
    }
  }
  return [...groupsSet.values()]
}

const computeKeyOfGroups = (groups: Groups): string => {
  const h = createHash('sha256')
  for (const k of Object.keys(groups)) {
    const v = groups[k]
    h.write(k)
    h.write('\0')
    h.write(v)
    h.write('\0')
  }
  return h.digest('hex')
}

const compilePathToRegexp = (s: string): RegExp => {
  const pathSegments = s.split('/').map((pathSegment) =>
    pathSegment
      .replaceAll('.', '\\.')
      .replaceAll('**', '.+?')
      .replaceAll('*', '[^/]+?')
      .replaceAll(/:([a-zA-Z0-9]+)/g, '(?<$1>[^/]+?)'),
  )
  return new RegExp(`^${pathSegments.join('/')}$`)
}

export const transform = (pattern: string, groupsSet: Groups[]): string[] => {
  const paths = new Set<string>()
  for (const groups of groupsSet) {
    const path = pattern
      .split('/')
      .map((pathSegment) =>
        pathSegment.replaceAll(/:([a-zA-Z0-9]+)/g, (_, variableKey: string): string => {
          const variableValue = groups[variableKey]
          if (variableValue === undefined) {
            return '*'
          }
          return variableValue
        }),
      )
      .join('/')
    paths.add(path)
  }
  return [...paths]
}

export const transformToWildcard = (pattern: string): string[] => transform(pattern, [{}])
