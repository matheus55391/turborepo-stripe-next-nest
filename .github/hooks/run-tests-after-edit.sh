#!/bin/bash
# Post-edit hook: reminds the agent to run tests after file modifications
# Reads the PostToolUse event from stdin and checks if a source file was edited

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.toolInput.filePath // .toolInput.file_path // ""')

# Only trigger for file-editing tools
if [[ "$TOOL_NAME" != "replace_string_in_file" && "$TOOL_NAME" != "multi_replace_string_in_file" && "$TOOL_NAME" != "create_file" ]]; then
  exit 0
fi

# Only trigger for source files (not test files, not configs)
if [[ "$FILE_PATH" == *.spec.* ]] || [[ "$FILE_PATH" == *.test.* ]]; then
  exit 0
fi

if [[ "$FILE_PATH" != */apps/api/src/* ]] && [[ "$FILE_PATH" != */apps/web/src/* ]]; then
  exit 0
fi

# Extract the filename without extension for test matching
BASENAME=$(basename "$FILE_PATH" | sed 's/\.[^.]*$//')

# Determine which app
if [[ "$FILE_PATH" == */apps/api/* ]]; then
  TEST_CMD="cd apps/api && pnpm test -- --testPathPattern=$BASENAME"
elif [[ "$FILE_PATH" == */apps/web/* ]]; then
  TEST_CMD="cd apps/web && pnpm test -- --testPathPattern=$BASENAME"
else
  exit 0
fi

# Inject a system message reminding the agent to run tests
cat <<EOF
{
  "systemMessage": "[TDD] You just edited $FILE_PATH. Run the related tests now: $TEST_CMD"
}
EOF
