#!/bin/bash

set -euo pipefail

echo "🔎 release verification: lint"
npm run lint

echo "🧪 release verification: test"
npm run test

echo "🏗️  release verification: build"
npm run build

echo "✅ release verification complete"
