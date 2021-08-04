import { createHash } from 'crypto'

export type Groups = { [key: string]: string | undefined }

const computeGroupsKey = (g: Groups): string => {
  const h = createHash('sha256')
  for (const k of Object.keys(g)) {
    const v = g[k]
    h.write(k)
    h.write('\0')
    h.write(v)
    h.write('\0')
  }
  return h.digest('hex')
}

export const match = (patterns: string[], files: string[]): boolean => {
  const regexps = patterns.map(compilePathToRegexp)
  for (const f of files) {
    for (const re of regexps) {
      if (re.test(f)) {
        return true
      }
    }
  }
  return false
}

export const exec = (patterns: string[], files: string[]): Groups[] => {
  const regexps = patterns.map(compilePathToRegexp)
  const groups = new Map<string, Groups>()
  for (const f of files) {
    for (const re of regexps) {
      const m = re.exec(f)
      if (m?.groups !== undefined) {
        const key = computeGroupsKey(m.groups)
        groups.set(key, m.groups)
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
  return [...paths.values()]
}

export const transformToWildcard = (pattern: string): string[] => transform(pattern, [{}])
