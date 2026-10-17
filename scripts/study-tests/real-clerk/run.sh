#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."

if [[ "${CLERK_SECRET_KEY:-}" != sk_test_* || "${CLERK_PUBLISHABLE_KEY:-}" != pk_test_* ]]; then
  echo "This test only runs against Clerk development keys. No application database was touched." >&2
  exit 2
fi

work="$(mktemp -d /tmp/yael-study-clerk-tests.XXXXXX)"
cleanup() {
  pg_ctl -D "$work/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

initdb -D "$work/data" -A trust -U study_clerk_test --no-locale >/dev/null
pg_ctl -D "$work/data" -l "$work/postgres.log" \
  -o "-k $work -c listen_addresses='' -c fsync=off" -w start >/dev/null
export DATABASE_URL="postgresql://study_clerk_test@localhost/postgres?host=$work"
export STUDY_TEST_DATABASE=isolated

pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts exec tsx study-tests/real-clerk/index.ts
