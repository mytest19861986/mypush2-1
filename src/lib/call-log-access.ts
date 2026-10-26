import { NextRequest } from 'next/server'
import { requireCurrentPermission } from '@/lib/current-permissions'

export function requireCallLogAccess(request: NextRequest, permission: 'view_call_logs' | 'manage_call_logs') {
  return requireCurrentPermission(request, permission, permission === 'view_call_logs' ? ['manage_call_logs'] : [])
}
