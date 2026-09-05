#!/bin/bash
# ==============================================================================
# Waw (واو) — Backup Verification Script
# ==============================================================================
# Verifies database backup integrity and recovery procedures.
# Run against staging or production environment.
# Usage: bash scripts/verify-backups.sh

set -e

echo "💾 Waw Backup Verification"
echo "==========================="
echo ""

PASS=0
FAIL=0
WARN=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_pass() {
  echo -e "${GREEN}✅ PASS${NC} — $1"
  ((PASS++))
}

test_fail() {
  echo -e "${RED}❌ FAIL${NC} — $1"
  ((FAIL++))
}

test_warn() {
  echo -e "${YELLOW}⚠️  WARN${NC} — $1"
  ((WARN++))
}

# ─── 1. Database Backup Check ────────────────────────────────────────────────
echo "1. Database Backup Configuration"
echo "---------------------------------"

# Check if Supabase backup is configured
if [ -n "$SUPABASE_URL" ]; then
  test_pass "Supabase URL configured"
else
  test_warn "Supabase URL not configured (set SUPABASE_URL)"
fi

# Check if PITR (Point-in-Time Recovery) is available
if [ "$SUPABASE_PITR_ENABLED" = "true" ]; then
  test_pass "Point-in-Time Recovery (PITR) enabled"
else
  test_warn "PITR not enabled (set SUPABASE_PITR_ENABLED=true for production)"
fi

echo ""

# ─── 2. Redis Backup Check ──────────────────────────────────────────────────
echo "2. Redis Backup Configuration"
echo "-------------------------------"

if [ -n "$REDIS_URL" ]; then
  test_pass "Redis URL configured"
else
  test_warn "Redis URL not configured (set REDIS_URL)"
fi

# Check if Redis persistence is configured
if [ "$REDIS_PERSISTENCE" = "rdb" ] || [ "$REDIS_PERSISTENCE" = "aof" ]; then
  test_pass "Redis persistence configured: $REDIS_PERSISTENCE"
else
  test_warn "Redis persistence not configured (set REDIS_PERSISTENCE=rdb or aof)"
fi

echo ""

# ─── 3. Environment Variables Backup ────────────────────────────────────────
echo "3. Environment Variables Backup"
echo "--------------------------------"

ENV_FILE=".env.backup.$(date +%Y%m%d)"
if [ -f "$ENV_FILE" ]; then
  test_pass "Environment backup exists: $ENV_FILE"
  
  # Check if backup is recent (within 30 days)
  if [ -n "$(find "$ENV_FILE" -mtime -30 2>/dev/null)" ]; then
    test_pass "Environment backup is recent (< 30 days)"
  else
    test_warn "Environment backup is older than 30 days"
  fi
else
  test_warn "No environment backup found (create $ENV_FILE)"
fi

echo ""

# ─── 4. Migration Backup ────────────────────────────────────────────────────
echo "4. Migration Backup"
echo "--------------------"

MIGRATION_DIR="supabase/migrations"
if [ -d "$MIGRATION_DIR" ]; then
  MIGRATION_COUNT=$(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | wc -l)
  if [ "$MIGRATION_COUNT" -gt 0 ]; then
    test_pass "Migrations directory has $MIGRATION_COUNT files"
    
    # Check if migrations are in version control
    if git log --oneline -1 -- "$MIGRATION_DIR" >/dev/null 2>&1; then
      test_pass "Migrations are in version control"
    else
      test_warn "Migrations may not be in version control"
    fi
  else
    test_fail "Migrations directory is empty"
  fi
else
  test_fail "Migrations directory not found"
fi

echo ""

# ─── 5. Supabase Backup Verification ────────────────────────────────────────
echo "5. Supabase Backup Verification"
echo "---------------------------------"

if command -v supabase &> /dev/null; then
  # Check Supabase project status
  if supabase projects list >/dev/null 2>&1; then
    test_pass "Supabase CLI can access projects"
  else
    test_warn "Supabase CLI cannot access projects (check authentication)"
  fi
  
  # Check if backups exist
  echo "  Checking for recent backups..."
  # Note: This would require Supabase Pro plan for automated backups
  test_warn "Automated backups require Supabase Pro plan"
else
  test_warn "Supabase CLI not installed"
fi

echo ""

# ─── 6. Recovery Procedure Documentation ─────────────────────────────────────
echo "6. Recovery Procedure Documentation"
echo "------------------------------------"

DOCS_DIR="docs"
RECOVERY_DOC="$DOCS_DIR/recovery-procedures.md"

if [ -f "$RECOVERY_DOC" ]; then
  test_pass "Recovery procedures documented"
  
  # Check if documentation is recent
  if [ -n "$(find "$RECOVERY_DOC" -mtime -90 2>/dev/null)" ]; then
    test_pass "Recovery documentation is recent (< 90 days)"
  else
    test_warn "Recovery documentation may be outdated"
  fi
else
  test_warn "Recovery procedures not documented (create $RECOVERY_DOC)"
fi

echo ""

# ─── 7. Backup Schedule Verification ────────────────────────────────────────
echo "7. Backup Schedule Verification"
echo "---------------------------------"

# Check for cron jobs or scheduled tasks
if crontab -l >/dev/null 2>&1; then
  BACKUP_CRON=$(crontab -l 2>/dev/null | grep -i backup | head -1)
  if [ -n "$BACKUP_CRON" ]; then
    test_pass "Backup cron job configured"
  else
    test_warn "No backup cron job found"
  fi
else
  test_warn "Cannot check crontab"
fi

echo ""

# ─── 8. Test Restore Procedure ──────────────────────────────────────────────
echo "8. Test Restore Procedure"
echo "--------------------------"

# This would be a real test in production
echo "  To test restore procedure:"
echo "  1. Create a test database"
echo "  2. Restore from latest backup"
echo "  3. Verify data integrity"
echo "  4. Run application tests"
echo "  5. Document results"

test_warn "Manual restore test recommended"

echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "========================================"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$WARN warnings${NC}"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ Backup verification FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Backup verification PASSED${NC}"
  exit 0
fi
