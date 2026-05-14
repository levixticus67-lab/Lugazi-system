#!/usr/bin/env bash
  # exit on error
  set -o errexit

  # explicitly change to the repository root, just in case
  cd $RENDER_PROJECT_ROOT

  # Install dependencies for the entire monorepo
  echo "Installing dependencies..."
  pnpm install --no-frozen-lockfile

  # Run the build for the specific api-server workspace
  echo "Building api-server..."
  pnpm --filter @workspace/api-server run build

  echo "Build complete."
  