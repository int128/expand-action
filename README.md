# expand-action [![ts](https://github.com/int128/expand-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/expand-action/actions/workflows/ts.yaml)

This is an action to expand path patterns by changed files in a pull request.


## Motivation

### Background

This action provides an alternative of `paths` trigger for a monorepo (mono repository).
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

### Problem to solve

It often needs to inspect crosscutting concern against all modules.
For example,

- Policy test for Kubernetes manifests
- Security test with common rules

It takes a long time to process all modules if there are many modules in a monorepo.

### Solution

This action expands path patterns by changed files in a pull request.
It reduces a number of modules to process in a workflow.


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

To run `kustomize build` for changed components in a pull request:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: int128/expand-action@v1
        id: expand
        with:
          paths: |
            clusters/:cluster/:component/**
          transform: |
            kustomization=clusters/:cluster/:component/kustomization.yaml
      - uses: int128/kustomize-action@v1
        with:
          kustomization: ${{ steps.expand.outputs.kustomization }}
```

This action expands paths by the following rule:

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

and finally this action sets an output to `clusters/staging/cluster-autoscaler/kustomization.yaml`.


## Inputs

| Name | Default | Description
|------|---------|------------
| `paths` | required | paths to expand
| `paths-always` | empty | paths to fallback to wildcard
| `transform` | required | paths to transform in form of `NAME=PATH`
| `token` | `github.token` | GitHub token to list files



## Outputs

This action sets the names defined by `transform` in inputs.
