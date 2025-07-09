import { createHash } from 'crypto'

export type Groups = { [key: string]: string | undefined }

const computeGroupsKey = (groups: Groups): string => {
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
  const groups = new Map<string, Groups>()
  for (const changedFile of changedFiles) {
    for (const re of regexps) {
      const matcher = re.exec(changedFile)
      if (matcher?.groups !== undefined) {
        const groupKey = computeGroupsKey(matcher.groups)
        groups.set(groupKey, matcher.groups)
      }
    }
  }
  return [...groups.values()]
}

const compilePathToRegexp = (s: string): RegExp => {
  const elements = s.split('/').map((e) => {
    if (e.startsWith(':')) {
      return `(?<${e.substring(1)}>[^/]+?)`
    }
    if (e === '*') {
      return `[^/]+?`
    }
    if (e === '**') {
      return `.+?`
    }
    return e
  })
  return new RegExp(`^${elements.join('/')}$`)
}

export const transform = (pattern: string, groups: Groups[]): string[] => {
  const paths = new Set<string>()
  for (const group of groups) {
    const path = pattern
      .split('/')
      .map((e): string => {
        if (e.startsWith(':')) {
          const k = e.substring(1)
          const v = group[k]
          if (v === undefined) {
            return '*'
          }
          return v
        }
        return e
      })
      .join('/')
    paths.add(path)
  }
  return [...paths]
}

export const transformToWildcard = (pattern: string): string[] => transform(pattern, [{}])
