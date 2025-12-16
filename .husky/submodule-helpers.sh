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

# Function to retry a command with exponential backoff
retry_with_backoff() {
  local max_attempts=5
  local timeout=1
  local attempt=1
  local exitCode=0

  while [ $attempt -le $max_attempts ]; do
    if eval "$@"; then
      return 0
    else
      exitCode=$?
    fi

    if [ $attempt -lt $max_attempts ]; then
      sleep $timeout
      timeout=$((timeout * 2))
    fi
    attempt=$((attempt + 1))
  done

  return $exitCode
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
  
  # Execute the command in a subshell to avoid directory change issues
  (
    cd "$SUBMODULE_PATH" || {
      echo -e "${YELLOW}⚠️  Could not enter $SUBMODULE_NAME directory${NC}"
      return 0
    }
    
    # Execute the command
    if eval "$command" 2>&1; then
      echo -e "${GREEN}✓ $SUBMODULE_NAME: $operation successful${NC}"
      return 0
    else
      echo -e "${YELLOW}⚠️  $SUBMODULE_NAME: $operation failed (non-fatal)${NC}"
      return 0
    fi
  )
  
  return 0
}

# Export functions for use in other scripts
export -f check_remote_access
export -f safe_submodule_exec
export -f retry_with_backoff
export SUBMODULE_PATH
export SUBMODULE_NAME
export RED YELLOW GREEN NC
