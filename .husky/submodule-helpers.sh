#!/bin/bash
# Helper script for soft submodule operations
# Returns 0 (success) even if submodule operations fail

SUBMODULE_PATH="content/private"
SUBMODULE_NAME="private content"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check if submodule exists
if [ ! -d "$SUBMODULE_PATH" ]; then
  echo -e "${YELLOW}⚠️  $SUBMODULE_NAME submodule not initialized${NC}"
  exit 0
fi

# Check if .git exists in submodule (it's properly initialized)
if [ ! -e "$SUBMODULE_PATH/.git" ]; then
  echo -e "${YELLOW}⚠️  $SUBMODULE_NAME submodule not properly initialized${NC}"
  exit 0
fi

# Function to check if remote is accessible
check_remote_access() {
  cd "$SUBMODULE_PATH" 2>/dev/null || return 1
  git ls-remote --exit-code origin HEAD &>/dev/null
  local result=$?
  cd - > /dev/null
  return $result
}

# Function to safely execute git operations in submodule
safe_submodule_exec() {
  local operation="$1"
  local command="$2"
  
  if ! check_remote_access; then
    echo -e "${YELLOW}⚠️  $SUBMODULE_NAME remote not accessible - skipping $operation${NC}"
    echo -e "${YELLOW}   (This is normal if you don't have access to the private repository)${NC}"
    return 0
  fi
  
  cd "$SUBMODULE_PATH" || {
    echo -e "${YELLOW}⚠️  Could not enter $SUBMODULE_NAME directory${NC}"
    return 0
  }
  
  # Execute the command
  if eval "$command" 2>&1; then
    echo -e "${GREEN}✓ $SUBMODULE_NAME: $operation successful${NC}"
    cd - > /dev/null
    return 0
  else
    echo -e "${YELLOW}⚠️  $SUBMODULE_NAME: $operation failed (non-fatal)${NC}"
    cd - > /dev/null
    return 0
  fi
}

# Export functions for use in other scripts
export -f check_remote_access
export -f safe_submodule_exec
export SUBMODULE_PATH
export SUBMODULE_NAME
export RED YELLOW GREEN NC
