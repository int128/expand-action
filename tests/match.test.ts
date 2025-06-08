import { it, expect } from 'vitest'
import { exec, transform, transformToWildcard } from '../src/match.js'

it('match against patterns', () => {
  const m = exec(
    ['clusters/:cluster/:component/**'],
    [
      'clusters/staging/cluster-autoscaler/helmfile.yaml',
      'clusters/staging/cluster-autoscaler/values.yaml',
      'clusters/production/coredns/deployment.yaml',
    ],
  )
  expect(m).toBeTruthy()
})

it('exec against path variables', () => {
  const m = exec(
    ['clusters/:cluster/:component/**'],
    [
      'clusters/staging/cluster-autoscaler/helmfile.yaml',
      'clusters/staging/cluster-autoscaler/values.yaml',
      'clusters/production/coredns/deployment.yaml',
    ],
  )
  expect(m).toEqual([
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

it('transform paths', () => {
  const p = transform('clusters/:cluster/:component/kustomization.yaml', [
    {
      cluster: 'staging',
      component: 'cluster-autoscaler',
    },
    {
      cluster: 'production',
      component: 'coredns',
    },
  ])
  expect(p).toStrictEqual([
    'clusters/staging/cluster-autoscaler/kustomization.yaml',
    'clusters/production/coredns/kustomization.yaml',
  ])
})

it('transform paths with no group', () => {
  const p = transformToWildcard('clusters/:cluster/:component/kustomization.yaml')
  expect(p).toStrictEqual(['clusters/*/*/kustomization.yaml'])
})
