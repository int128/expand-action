# reduce-action [![ts](https://github.com/int128/reduce-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/reduce-action/actions/workflows/ts.yaml)

This is an action to generate a path pattern from changed files in a pull request.


## Motivation

This action is an alternative of `path` trigger for a monorepo (mono repository).
Typically a monorepo contains many modules, for example,

```
monorepo
├── microservice1
├── microservice2
├── ...
├── microserviceN
└── common-policy
```

GitHub Actions provides `paths` trigger.
In most cases, an owner of microservice creates a workflow for test or build.
For example, a workflow for test of Go microservice is like,

```yaml
name: microservice1--test
on:
  pull_request:
    paths:
      - microservice1/**
jobs:
  lint:
    steps:
      - uses: actions/checkout@v2
      - uses: golangci/golangci-lint-action@v2
  test:
    steps:
      - uses: actions/checkout@v2
      - run: make -C microservice1 test
```

On the other hand, it would be nice to inspect crosscutting concern for all modules.
For example,

- Policy test for Kubernetes manifests
- Security test with common rules

If there are many modules in a monorepo, it takes a long time to process all modules.

This action reduces a number of modules to process in a monorepo.
It generates paths based on changed files in a pull request.


## Getting Started

### Usecase: build manifests against changed paths

Let's think a case of monorepo with Kubernetes components.
For example,

```
clusters
├── staging
|   ├── cluster-autoscaler
|   └── coredns
└── production
    └── cluster-autoscaler
```

You can generates paths from changed files in a pull request.

```yaml
jobs:
  reduce:
    runs-on: ubuntu-latest
    steps:
      - uses: int128/reduce-action@v1
        id: reduce
        with:
          paths: |
            clusters/:cluster/:component/**
          transform: |
            kustomization=clusters/:cluster/:component/kustomization.yaml
    outputs:
      kustomization: ${{ steps.reduce.outputs.kustomization }}

  build:
    needs:
      - reduce
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: int128/kustomize-action@v1
        with:
          kustomization: ${{ needs.reduce.outputs.kustomization }}
```

In this example, this action generates paths by the following rule:

```
clusters/:cluster/:component/**
↓
clusters/:cluster/:component/kustomization.yaml
```

If `clusters/staging/cluster-autoscaler/config.yaml` is changed in a pull request, the rule would be:

```
clusters/staging/cluster-autoscaler/**
↓
clusters/staging/cluster-autoscaler/kustomization.yaml
```

and this action outputs path `clusters/staging/cluster-autoscaler/kustomization.yaml`.

Finally, the next action runs kustomize build for the path.


## Inputs

| Name | Default | Description
|------|---------|------------
| `paths` | required | paths to match
| `paths-always` | empty | paths to fallback to wildcard
| `transform` | required | paths to transform in form of `NAME=PATH`
| `token` | `github.token` | GitHub token to list files



## Outputs

This action sets the names defined by `transform` in inputs.
