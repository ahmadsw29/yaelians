#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# Never use the application's DATABASE_URL. Each run owns a disposable cluster.
work="$(mktemp -d /tmp/yael-study-tests.XXXXXX)"
cleanup() {
  pg_ctl -D "$work/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
initdb -D "$work/data" -A trust -U study_test --no-locale >/dev/null
pg_ctl -D "$work/data" -l "$work/postgres.log" \
  -o "-k $work -c listen_addresses='' -c fsync=off" -w start >/dev/null
export DATABASE_URL="postgresql://study_test@localhost/postgres?host=$work"
export STUDY_TEST_DATABASE=isolated
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts exec vitest run --config study-tests/vitest.config.ts
export STUDY_TEST_STORAGE="$work/device-storage.json"
STUDY_RESTART_PHASE=before pnpm --filter @workspace/scripts exec vitest run --config study-tests/vitest.config.ts
STUDY_RESTART_PHASE=after pnpm --filter @workspace/scripts exec vitest run --config study-tests/vitest.config.ts
node --test artifacts/api-server/src/lib/study.test.ts
