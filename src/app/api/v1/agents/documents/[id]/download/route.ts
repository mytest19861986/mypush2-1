import { NextRequest } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { db } from '@/lib/db'
import { authenticateRequest, requirePermission } from '@/lib/auth'
import { errorResponse } from '@/lib/api-response'

// GET /api/v1/agents/documents/[id]/download — Download agent document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Agent can download their own documents, or user with manage_agents can download any
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  const { id } = await params

  // Check if user is AGENT or has manage_agents permission
  const isAgent = payload!.roles.includes('AGENT')
  const hasManagePermission = payload!.permissions.includes('manage_agents')

  if (!isAgent && !hasManagePermission) {
    return errorResponse('FORBIDDEN', 'AGENT role or manage_agents permission required', 403)
  }

  // Find document
  const document = await db.agentDocument.findUnique({
    where: { id },
  })
  if (!document) {
    return errorResponse('NOT_FOUND', 'Document not found', 404)
  }

  // If agent, verify the document belongs to them
  if (isAgent && !hasManagePermission) {
    const agent = await db.agent.findUnique({
      where: { userId: payload!.sub },
    })
    if (!agent || agent.id !== document.agentId) {
      return errorResponse('FORBIDDEN', 'You can only download your own documents', 403)
    }
  }

  // Resolve file path
  const filePath = path.join(process.cwd(), 'private-uploads', document.file)

  try {
    const fileBuffer = await readFile(filePath)
    const fileStat = await stat(filePath)

    // Determine content type from extension
    const ext = path.extname(filePath).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
      },
    })
  } catch {
    return errorResponse('NOT_FOUND', 'File not found on disk', 404)
  }
}
