# cellar-subgraphs
Subgraphs that track Cellar statistics

## Directory Structure
- `packages` - A yarn workspace that houses shared libraries such as abis and constants
- `subgraphs` - A yarn workspace that houses subgraph packages

## Installation
```bash
cd cellar-subgraphs
```
```bash
yarn install
```

## Running a subgraph locally
You'll need to have a `graph-node` running locally to deploy a subgraph for development. The Graph Protocol team has a premade docker setup that spins up all the dependencies: Postgres, an IPFS node, and a graph-node.

First and foremost, obtain a rpc url for the ethereum network you are targeting (mainnet, rinkeby, etc...). Cloud RPC providers such as Alchemy and Infura work pretty well and Alchemy's free tier is quite generous.
```bash
git clone git@github.com:graphprotocol/graph-node.git
```
```bash
cd graph-node/docker
```

Update the `docker-compose.yml` file and replace the ethereum rpc url with the one you obtained earlier.
```yaml
graph-node:
  environment:
    ethereum: 'mainnet:http://host.docker.internal:8545'
```
```bash
docker compse up
```

## Running tests
WIP

```bash
yarn test
```

### M1 Macs
M1 macs are not officially supported but they do have some [instructions](git@github.com:graphprotocol/graph-node.git) on how to rebuild the graph-node image and use `docker compose up`. Alternatively, you can open a rosetta terminal and run the development version.
- Install Rust in a Rosetta terminal (This will clash with an existing arm64 install! It is possible to run these side by side with the right shell configuration.)
- Start the graph-node

```bash
cargo run -p graph-node --release -- \
--postgres-url postgresql://postgres:let-me-in@localhost:5432/graph-node \
--ethereum-rpc mainnet:<your http rpc url> \
--ipfs 127.0.0.1:5001
```

Your graph node is now up and the graphql interface is reachable at:
```bash
http://localhost:8000/subgraphs/name/<subgraph prefix>/<subgraph name>/graphql
```

## Deploying
### Locally
```bash
yarn workspace <subgraph name> deploy-local
```

### Hosted Service
```bash
yarn workspace <subgraph name> deploy-hosted
```
