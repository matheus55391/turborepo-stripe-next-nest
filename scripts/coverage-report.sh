#!/usr/bin/env bash
set -uo pipefail

BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
DIM="\033[2m"
RESET="\033[0m"

THRESHOLD=60

parse_summary() {
  local output="$1"
  stmts=$(echo "$output" | grep "Statements" | grep -oE '[0-9]+\.[0-9]+' | head -1)
  branch=$(echo "$output" | grep "Branches" | grep -oE '[0-9]+\.[0-9]+' | head -1)
  funcs=$(echo "$output" | grep "Functions" | grep -oE '[0-9]+\.[0-9]+' | head -1)
  lines=$(echo "$output" | grep "Lines" | grep -oE '[0-9]+\.[0-9]+' | head -1)
  tests=$(echo "$output" | grep "^Tests:" | grep -oE '[0-9]+ passed' | head -1 || echo "0 passed")
  suites=$(echo "$output" | grep "^Test Suites:" | grep -oE '[0-9]+ passed' | head -1 || echo "0 passed")
}

colorize() {
  local val="$1"
  local int=${val%.*}
  if (( int >= 80 )); then echo -e "${GREEN}${val}%${RESET}"
  elif (( int >= THRESHOLD )); then echo -e "${YELLOW}${val}%${RESET}"
  else echo -e "${RED}${val}%${RESET}"
  fi
}

print_section() {
  local label="$1"
  printf "\n${BOLD}${CYAN}%-12s${RESET} ${DIM}│${RESET} Stmts: %s  Branch: %s  Funcs: %s  Lines: %s\n" \
    "$label" "$(colorize "$stmts")" "$(colorize "$branch")" "$(colorize "$funcs")" "$(colorize "$lines")"
  printf "             ${DIM}│${RESET} ${DIM}%s · %s${RESET}\n" "$suites" "$tests"
}

echo ""
echo -e "${BOLD}Running tests with coverage...${RESET}"
echo ""

# ── API ──────────────────────────────────────────
api_output=$(cd apps/api && npx jest --coverage 2>&1) || true
parse_summary "$api_output"
api_stmts=$stmts api_branch=$branch api_funcs=$funcs api_lines=$lines
api_tests=$tests api_suites=$suites

# ── WEB ──────────────────────────────────────────
web_output=$(cd apps/web && npx jest --coverage 2>&1) || true
parse_summary "$web_output"
web_stmts=$stmts web_branch=$branch web_funcs=$funcs web_lines=$lines
web_tests=$tests web_suites=$suites

# ── Combined ─────────────────────────────────────
avg() { echo "scale=2; ($1 + $2) / 2" | bc; }
total_stmts=$(avg "$api_stmts" "$web_stmts")
total_branch=$(avg "$api_branch" "$web_branch")
total_funcs=$(avg "$api_funcs" "$web_funcs")
total_lines=$(avg "$api_lines" "$web_lines")

api_t=${api_tests% passed}
web_t=${web_tests% passed}
total_tests=$((api_t + web_t))
api_s=${api_suites% passed}
web_s=${web_suites% passed}
total_suites=$((api_s + web_s))

# ── Output ───────────────────────────────────────
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}                    TEST COVERAGE REPORT                      ${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"

stmts=$api_stmts branch=$api_branch funcs=$api_funcs lines=$api_lines tests=$api_tests suites=$api_suites
print_section "Backend"

stmts=$web_stmts branch=$web_branch funcs=$web_funcs lines=$web_lines tests=$web_tests suites=$web_suites
print_section "Frontend"

echo -e "\n${DIM}─────────────────────────────────────────────────────────────${RESET}"

stmts=$total_stmts branch=$total_branch funcs=$total_funcs lines=$total_lines
tests="$total_tests passed" suites="$total_suites passed"
print_section "Total"

echo ""
echo -e "${DIM}  Threshold: ${THRESHOLD}%  ·  ${GREEN}■${RESET}${DIM} ≥80%  ${YELLOW}■${RESET}${DIM} ≥${THRESHOLD}%  ${RED}■${RESET}${DIM} <${THRESHOLD}%${RESET}"
echo ""
