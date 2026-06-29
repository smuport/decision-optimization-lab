#!/usr/bin/env bash

set -euo pipefail

export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-55432}"
export PGUSER="${PGUSER:-decision_lab}"
export PGPASSWORD="${PGPASSWORD:-decision_lab_dev}"

readonly DEV_DATABASE="decision_lab"
readonly EMPTY_DATABASE="decision_lab_week3_day1_verify"
readonly BACKUP_PATH="/tmp/decision_lab_before_week3_day1.dump"
readonly DATA_CHECK="backend/prisma/tests/week3_day1_data_check.sql"

database_url() {
  local database="$1"
  printf 'postgresql://%s:%s@%s:%s/%s?schema=public' \
    "$PGUSER" "$PGPASSWORD" "$PGHOST" "$PGPORT" "$database"
}

counts() {
  local database="$1"
  psql -X -At -d "$database" -c \
    "SELECT concat_ws(',',
      (SELECT count(*) FROM submissions),
      (SELECT count(*) FROM run_results),
      (SELECT count(*) FROM scores));"
}

run_migration_and_seed() {
  local database="$1"
  export DECISION_LAB_DATABASE_URL
  DECISION_LAB_DATABASE_URL="$(database_url "$database")"

  corepack pnpm --filter backend exec prisma migrate deploy --schema prisma/schema.prisma
  corepack pnpm --filter backend prisma:seed
  corepack pnpm --filter backend prisma:seed
  psql -X -v ON_ERROR_STOP=1 -d "$database" -f "$DATA_CHECK"
}

cleanup() {
  dropdb --if-exists "$EMPTY_DATABASE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[1/4] Backing up the Week2 development database to $BACKUP_PATH"
pg_dump -Fc -d "$DEV_DATABASE" -f "$BACKUP_PATH"
before_counts="$(counts "$DEV_DATABASE")"

echo "[2/4] Verifying migrations and repeated seed on an empty database"
dropdb --if-exists "$EMPTY_DATABASE"
createdb "$EMPTY_DATABASE"
run_migration_and_seed "$EMPTY_DATABASE"

echo "[3/4] Migrating the existing development database"
run_migration_and_seed "$DEV_DATABASE"
after_counts="$(counts "$DEV_DATABASE")"

echo "[4/4] Comparing Week2 historical row counts"
if [[ "$before_counts" != "$after_counts" ]]; then
  echo "Historical counts changed: before=$before_counts after=$after_counts" >&2
  exit 1
fi

echo "Week3 Day1 database verification passed: counts=$after_counts"
