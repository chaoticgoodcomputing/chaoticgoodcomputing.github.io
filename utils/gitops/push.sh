#!/bin/bash
# Git push orchestrator for public repo + private submodule
# Pushes submodule first, then main repo

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SUBMODULE_PATH="content/private"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Git Push Orchestrator${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ─────────────────────────────────────────────────────────
# Step 1: Check for unpushed commits
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}[1/3]${NC} Checking for unpushed commits..."

MAIN_HAS_UNPUSHED=false
SUBMODULE_HAS_UNPUSHED=false

# Check main repo
LOCAL=$(git rev-parse @ 2>/dev/null || echo "")
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")
if [ -n "$LOCAL" ] && [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
  MAIN_HAS_UNPUSHED=true
fi

# Check submodule
if [ -d "$SUBMODULE_PATH" ] && [ -e "$SUBMODULE_PATH/.git" ]; then
  SUB_LOCAL=$(cd "$SUBMODULE_PATH" && git rev-parse @ 2>/dev/null || echo "")
  SUB_REMOTE=$(cd "$SUBMODULE_PATH" && git rev-parse @{u} 2>/dev/null || echo "")
  if [ -n "$SUB_LOCAL" ] && [ -n "$SUB_REMOTE" ] && [ "$SUB_LOCAL" != "$SUB_REMOTE" ]; then
    SUBMODULE_HAS_UNPUSHED=true
  fi
fi

echo -e "   Main repo: $([ "$MAIN_HAS_UNPUSHED" = true ] && echo -e "${GREEN}has unpushed commits${NC}" || echo "up to date")"
echo -e "   Submodule: $([ "$SUBMODULE_HAS_UNPUSHED" = true ] && echo -e "${GREEN}has unpushed commits${NC}" || echo "up to date")"

if [ "$MAIN_HAS_UNPUSHED" = false ] && [ "$SUBMODULE_HAS_UNPUSHED" = false ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Nothing to push - both repositories are up to date${NC}"
  exit 0
fi
echo ""

# ─────────────────────────────────────────────────────────
# Step 2: Push submodule first
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}[2/3]${NC} Pushing submodule..."

if [ "$SUBMODULE_HAS_UNPUSHED" = true ]; then
  if [ -d "$SUBMODULE_PATH" ] && [ -e "$SUBMODULE_PATH/.git" ]; then
    # Ensure submodule is on a branch (not detached HEAD)
    (
      cd "$SUBMODULE_PATH"
      
      # If detached, try to checkout main
      if ! git symbolic-ref -q HEAD > /dev/null; then
        echo -e "   ${YELLOW}Submodule in detached HEAD, checking out main...${NC}"
        git checkout main 2>/dev/null || git checkout -b main 2>/dev/null || true
      fi
      
      # Ensure upstream tracking
      if ! git rev-parse @{u} > /dev/null 2>&1; then
        git branch --set-upstream-to=origin/main main 2>/dev/null || true
      fi
      
      if git push; then
        echo -e "${GREEN}   ✓ Submodule pushed${NC}"
      else
        echo -e "${RED}   ❌ Submodule push failed${NC}"
        exit 1
      fi
    )
  fi
else
  echo -e "   ${YELLOW}No submodule commits to push${NC}"
fi
echo ""

# ─────────────────────────────────────────────────────────
# Step 3: Push main repo
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}[3/3]${NC} Pushing main repo..."

if [ "$MAIN_HAS_UNPUSHED" = true ]; then
  # Use --no-verify to skip hooks since we've handled everything
  if git push --no-verify; then
    echo -e "${GREEN}   ✓ Main repo pushed${NC}"
  else
    echo -e "${RED}   ❌ Main repo push failed${NC}"
    exit 1
  fi
else
  echo -e "   ${YELLOW}No main repo commits to push${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Push complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
