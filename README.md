# reduce-action [![ts](https://github.com/int128/reduce-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/reduce-action/actions/workflows/ts.yaml)

This is an action to reduce paths by changed files in a pull request.


## Getting Started

To run this action:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: int128/reduce-action@v1
        id: reduce
        with:
          paths: |
            clusters/:cluster/:component/**
          transform: |
            kustomization=clusters/:cluster/:component/kustomization.yaml
      - uses: int128/kustomize-action@v1
        with:
          kustomization: ${{ steps.reduce.outputs.kustomization }}
```


## Inputs

TODO


## Outputs

This action sets the keys defined in `transform`.
