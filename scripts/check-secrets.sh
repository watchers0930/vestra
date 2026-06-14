#!/bin/bash

set -euo pipefail

SECRET_PATTERN='(sk-[A-Za-z0-9_-]{20,}|sbp_[A-Za-z0-9]{20,}|postgres(ql)?://[^[:space:]]+:[^[:space:]]+@|vercel_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})'

echo "secret scan: tracked files"

if git grep -n -I -E "$SECRET_PATTERN" -- . \
  ':(exclude).env.example' \
  ':(exclude)package-lock.json' \
  ':(exclude)scripts/kibo-plan/package-lock.json' \
  ':(exclude)wiki/**' \
  ':(exclude)sample-docs/**'; then
  echo "secret scan failed: possible secret found in tracked files"
  exit 1
fi

echo "secret scan complete"
