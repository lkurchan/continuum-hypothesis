#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ ! -d lib/forge-std ]]; then
    forge install foundry-rs/forge-std@v1.17.0 --no-git --shallow
fi
if [[ ! -d lib/openzeppelin-contracts ]]; then
    forge install OpenZeppelin/openzeppelin-contracts@v5.4.0 --no-git --shallow
fi
