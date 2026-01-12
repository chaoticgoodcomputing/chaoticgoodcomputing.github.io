#!/usr/bin/env bash
set -e

# Check if Typst is installed
if ! command -v typst &> /dev/null; then
  echo "❌ Typst is not installed. Install via:"
  echo ""
  echo "  macOS:   brew install typst"
  echo "  Linux:   See https://github.com/typst/typst#installation"
  echo "  Windows: See https://github.com/typst/typst#installation"
  echo ""
  exit 1
fi

# Typst is installed
echo "✅ Typst is installed:"
typst --version
