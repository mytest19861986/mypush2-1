import { NextRequest } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { errorResponse } from '@/lib/api-response'

// GET /api/v1/uploads/[id] — Download/upload get a file by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  const { id } = await params

  // Find upload record
  const upload = await db.upload.findUnique({
    where: { id },
  })
  if (!upload) {
    return errorResponse('NOT_FOUND', 'Upload not found', 404)
  }

  // Only allow user to access their own uploads (or admin with manage_agents)
  const isAdmin = payload!.permissions.includes('manage_agents')
  if (upload.userId !== payload!.sub && !isAdmin) {
    return errorResponse('FORBIDDEN', 'You can only access your own uploads', 403)
  }

  // Resolve file path
  const filePath = path.join(process.cwd(), 'private-uploads', upload.path)

  try {
    const fileBuffer = await readFile(filePath)
    const fileStat = await stat(filePath)

    // Use stored MIME type or fallback
    const contentType = upload.mimeType || 'application/octet-stream'

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
