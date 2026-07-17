#!/bin/bash
# Fail if any file in apps/web/app/api/admin/ uses direct role checks instead of requireRole

grep -rnE "(role ===|role !==)" apps/web/app/api/admin/
if [ $? -eq 0 ]; then
  echo "ERROR: Found direct role checks in apps/web/app/api/admin/."
  echo "Please use requireRole from @/lib/auth/requireRole instead."
  exit 1
fi
echo "Auth check passed: No direct role checks found in admin routes."
exit 0
