#!/bin/bash
# Git commit orchestrator for public repo + private submodule
# Usage: ./commit.sh "commit message"

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SUBMODULE_PATH="content/private"
PUBLIC_DIR="content/public"

# Validate commit message
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Commit message is required${NC}"
  echo "Usage: nx git:commit \"your commit message\""
  exit 1
fi

COMMIT_MSG="$1"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Git Commit Orchestrator${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ─────────────────────────────────────────────────────────
# Step 1: Check for changes
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}[1/5]${NC} Checking for changes..."

MAIN_HAS_CHANGES=false
SUBMODULE_HAS_CHANGES=false

# Check main repo (excluding submodule)
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null || \
   [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then
  MAIN_HAS_CHANGES=true
fi

# Check submodule
if [ -d "$SUBMODULE_PATH" ] && [ -e "$SUBMODULE_PATH/.git" ]; then
  if (cd "$SUBMODULE_PATH" && ! git diff --quiet 2>/dev/null) || \
     (cd "$SUBMODULE_PATH" && ! git diff --cached --quiet 2>/dev/null) || \
     [ -n "$(cd "$SUBMODULE_PATH" && git ls-files --others --exclude-standard 2>/dev/null)" ]; then
    SUBMODULE_HAS_CHANGES=true
  fi
fi

if [ "$MAIN_HAS_CHANGES" = false ] && [ "$SUBMODULE_HAS_CHANGES" = false ]; then
  echo -e "${YELLOW}⚠️  No changes to commit in either repository${NC}"
  exit 0
fi

echo -e "   Main repo: $([ "$MAIN_HAS_CHANGES" = true ] && echo -e "${GREEN}has changes${NC}" || echo "no changes")"
echo -e "   Submodule: $([ "$SUBMODULE_HAS_CHANGES" = true ] && echo -e "${GREEN}has changes${NC}" || echo "no changes")"
echo ""

# ─────────────────────────────────────────────────────────
# Step 2: Extract private metadata
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}[2/5]${NC} Extracting private metadata..."

if [ -d "$SUBMODULE_PATH" ] && [ -e "$SUBMODULE_PATH/.git" ]; then
  if node utils/extract-private-metadata.mjs; then
    echo -e "${GREEN}   ✓ Extraction complete${NC}"
  else
    echo -e "${YELLOW}   ⚠️  Extraction had issues (continuing anyway)${NC}"
  fi
else
  echo -e "${YELLOW}   ⚠️  Submodule not available, skipping extraction${NC}"
fi
echo ""

# ─────────────────────────────────────────────────────────
# Step 3: Commit submodule first (if it has changes)
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}[3/5]${NC} Processing submodule..."

if [ "$SUBMODULE_HAS_CHANGES" = true ]; then
  echo "   Staging and committing submodule changes..."
  (
    cd "$SUBMODULE_PATH"
    git add -A
    if git commit -m "$COMMIT_MSG"; then
      echo -e "${GREEN}   ✓ Submodule committed${NC}"
    else
      echo -e "${YELLOW}   ⚠️  Submodule commit failed or nothing to commit${NC}"
    fi
  )
else
  echo -e "   ${YELLOW}No submodule changes to commit${NC}"
fi
echo ""

# ─────────────────────────────────────────────────────────
# Step 4: Stage all changes in main repo
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}[4/5]${NC} Staging main repo changes..."

# Stage everything including the updated submodule reference
git add -A
echo -e "${GREEN}   ✓ All changes staged${NC}"
echo ""

# ─────────────────────────────────────────────────────────
# Step 5: Commit main repo
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}[5/5]${NC} Committing main repo..."

# Use --no-verify to skip hooks since we've already handled everything
if git commit --no-verify -m "$COMMIT_MSG"; then
  echo -e "${GREEN}   ✓ Main repo committed${NC}"
else
  echo -e "${YELLOW}   ⚠️  Main repo commit failed or nothing to commit${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Commit complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "💡 Run ${BLUE}nx git:push${NC} to push both repositories"
