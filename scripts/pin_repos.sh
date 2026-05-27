#!/usr/bin/env bash
# Pins five recruiter-priority repos to the top of github.com/muddwallprod14.
#
# Usage:
#   1. Re-auth if needed:
#        gh auth login -h github.com -s read:user,user
#   2. Run:
#        bash scripts/pin_repos.sh
#
# Note: pinning user profile repos is not on GitHub's public GraphQL API.
# This script tries the undocumented updateUserPinnedItems mutation. If
# that fails, it prints UI fallback steps and exits non-zero.

set -euo pipefail

OWNER="muddwallprod14"
REPOS=(
  "UnrealSynopticRigger"
  "hdri-light-rig-manager"
  "flex-json-editor"
  "shader-behavioral-tree-addon"
  "uat-automation"
)

echo "==> Verifying gh auth"
if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: gh is not authenticated. Run:"
  echo "    gh auth login -h github.com -s read:user,user"
  exit 1
fi

echo "==> Looking up repository node IDs"
IDS=()
for repo in "${REPOS[@]}"; do
  id=$(gh api graphql -f query="query { repository(owner: \"$OWNER\", name: \"$repo\") { id } }" --jq '.data.repository.id' 2>/dev/null || true)
  if [ -z "$id" ] || [ "$id" = "null" ]; then
    echo "  WARN: could not resolve $OWNER/$repo (skipping)"
    continue
  fi
  echo "  $repo -> $id"
  IDS+=("\"$id\"")
done

if [ ${#IDS[@]} -eq 0 ]; then
  echo "ERROR: no repos resolved. Aborting."
  exit 1
fi

ITEMS_JSON=$(IFS=,; echo "[${IDS[*]}]")

echo "==> Attempting updateUserPinnedItems mutation"
set +e
RESPONSE=$(gh api graphql -f query="mutation { updateUserPinnedItems(input: { pinnedItems: $ITEMS_JSON }) { user { login } } }" 2>&1)
EXIT=$?
set -e

if [ $EXIT -eq 0 ]; then
  echo "$RESPONSE"
  echo "==> Done. Check https://github.com/$OWNER to confirm."
  exit 0
fi

echo "$RESPONSE"
echo
echo "==> Mutation failed (likely not supported on the public API)."
echo "    Fallback (takes ~60 seconds):"
echo "    1. Open https://github.com/$OWNER"
echo "    2. Click 'Customize your pins' on the right side"
echo "    3. Check these 5 repos in this order:"
for repo in "${REPOS[@]}"; do
  echo "       - $repo"
done
echo "    4. Click 'Save pins'"
exit 2
