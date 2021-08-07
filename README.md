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

It takes a long time to process all modules if a monorepo has many modules.

### Idea

This action expands path patterns by changed files in a pull request.

For example, if the following path patterns are given,

```yaml
paths: |
  :service/manifest/**
outputs: |
  kustomization=:service/manifest/kustomization.yaml
```

and the following file is changed in a pull request,

```
microservice1/manifest/deployment.yaml
```

this action determines the path variable as follows:

```
":service" => "microservice1"
```

Finally this action expands the pattern as follows:

```
microservice1/manifest/kustomization.yaml
```

It reduces a number of modules to process in a workflow.

### Consideration

It may need to inspect all modules if a specific file is changed, such as a common policy.
This action supports "fallback" path pattern.

For example, if the following path patterns are given,

```yaml
paths: |
  :service/manifest/**
paths-fallback: |
  conftest/**
outputs: |
  kustomization=:service/manifest/kustomization.yaml
```

and the following file is changed in a pull request,

```
conftest/policy/foo.rego
```

this action fallbacks to wildcard, that is, replaces a path variable with `*`, as follows:

```
*/manifest/kustomization.yaml
```


## Examples

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
          outputs: |
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
| `paths` | required | Paths to expand
| `paths-fallback` | empty | If any path is changed, fallback to wildcard
| `outputs` | required | Paths to set into outputs in form of `NAME=PATH`
| `token` | `github.token` | GitHub token to list files



## Outputs

This action sets the names defined by `outputs` in inputs.
