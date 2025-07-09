import { it, expect, describe } from 'vitest'
import { Groups, matchAny, matchGroups, transform, transformToWildcard } from '../src/match.js'

describe('matchAny', () => {
  it('matches against patterns', () => {
    const matched = matchAny(
      ['clusters/:cluster/:component/**'],
      [
        'clusters/staging/cluster-autoscaler/helmfile.yaml',
        'clusters/staging/cluster-autoscaler/values.yaml',
        'clusters/production/coredns/deployment.yaml',
      ],
    )
    expect(matched).toBe(true)
  })
})

describe('matchGroups', () => {
  it('matches against path variables', () => {
    const groupsSet = matchGroups(
      ['clusters/:cluster/:component/**'],
      [
        'clusters/staging/cluster-autoscaler/helmfile.yaml',
        'clusters/staging/cluster-autoscaler/values.yaml',
        'clusters/production/coredns/deployment.yaml',
      ],
    )
    expect(groupsSet).toEqual([
      {
        cluster: 'staging',
        component: 'cluster-autoscaler',
      },
      {
        cluster: 'production',
        component: 'coredns',
      },
    ])
  })
})

describe('transform', () => {
  it('returns paths corresponding to groups', () => {
    const groupsSet: Groups[] = [
      {
        cluster: 'staging',
        component: 'cluster-autoscaler',
      },
      {
        cluster: 'production',
        component: 'coredns',
      },
    ]
    const paths = transform('clusters/:cluster/:component/kustomization.yaml', groupsSet)
    expect(paths).toStrictEqual([
      'clusters/staging/cluster-autoscaler/kustomization.yaml',
      'clusters/production/coredns/kustomization.yaml',
    ])
  })
})

describe('transformToWildcard', () => {
  it('returns a wildcard pattern', () => {
    const paths = transformToWildcard('clusters/:cluster/:component/kustomization.yaml')
    expect(paths).toStrictEqual(['clusters/*/*/kustomization.yaml'])
  })
})
