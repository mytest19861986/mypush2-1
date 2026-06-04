import { NextRequest } from 'next/server'
import { z } from 'zod'
import { writeFile, mkdir, readFile, stat } from 'fs/promises'
import path from 'path'
import { db } from '@/lib/db'
import { authenticateRequest, requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { validateFile, getFileExtension } from '@/lib/upload'
import { createAuditLog, AuditActions } from '@/lib/audit'

const validUploadTypes = ['AVATAR', 'DOCUMENT', 'GENERAL'] as const

// GET /api/v1/uploads?type=AVATAR — Stream current user's saved avatar
export async function GET(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  const uploadType = request.nextUrl.searchParams.get('type')
  if (uploadType !== 'AVATAR') {
    return errorResponse('VALIDATION_ERROR', 'Unsupported upload lookup', 400)
  }

  const profile = await db.userProfile.findUnique({
    where: { userId: payload!.sub },
    select: { avatar: true },
  })

  if (!profile?.avatar) {
    return errorResponse('NOT_FOUND', 'Avatar not found', 404)
  }

  const upload = await db.upload.findFirst({
    where: {
      userId: payload!.sub,
      path: profile.avatar,
      type: 'AVATAR',
    },
  })

  if (!upload) {
    return errorResponse('NOT_FOUND', 'Avatar upload not found', 404)
  }

  const uploadsRoot = path.resolve(process.cwd(), 'private-uploads')
  const filePath = path.resolve(uploadsRoot, upload.path)
  const relativePath = path.relative(uploadsRoot, filePath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return errorResponse('VALIDATION_ERROR', 'Invalid avatar path', 400)
  }

  try {
    const fileBuffer = await readFile(filePath)
    const fileStat = await stat(filePath)

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': upload.mimeType || 'application/octet-stream',
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch {
    return errorResponse('NOT_FOUND', 'Avatar file not found', 404)
  }
}

// POST /api/v1/uploads — Upload a file
export async function POST(request: NextRequest) {
  const { authorized, payload, error } = await requirePermission(request, 'upload_documents')
  if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

  const formData = await request.formData()
  const uploadType = formData.get('type') as string | null
  const file = formData.get('file') as File | null

  if (!uploadType) {
    return errorResponse('VALIDATION_ERROR', 'Upload type is required', 400)
  }

  const typeParsed = z.enum(validUploadTypes).safeParse(uploadType)
  if (!typeParsed.success) {
    return errorResponse('VALIDATION_ERROR', `Invalid upload type. Must be one of: ${validUploadTypes.join(', ')}`, 400)
  }

  if (!file) {
    return errorResponse('VALIDATION_ERROR', 'File is required', 400)
  }

  // Validate file
  const validation = validateFile(file)
  if (!validation.valid) {
    return errorResponse('VALIDATION_ERROR', validation.error!, 400)
  }

  // Generate file path and save
  const extension = getFileExtension(file.type)
  const timestamp = Date.now()
  const randomId = crypto.randomUUID().slice(0, 8)
  const filename = `${timestamp}-${randomId}.${extension}`
  const uploadDir = path.join(process.cwd(), 'private-uploads', typeParsed.data, payload!.sub)

  // Ensure directory exists
  await mkdir(uploadDir, { recursive: true })

  const filePath = path.join(uploadDir, filename)
  const relativePath = `${typeParsed.data}/${payload!.sub}/${filename}`

  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))

  // Create Upload record
  const upload = await db.upload.create({
    data: {
      userId: payload!.sub,
      path: relativePath,
      type: typeParsed.data,
      size: file.size,
      mimeType: file.type,
    },
  })

  // Create audit log
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  const device = request.headers.get('user-agent') || undefined
  createAuditLog({
    userId: payload!.sub,
    action: AuditActions.UPLOAD_CREATED,
    entity: 'Upload',
    entityId: upload.id,
    details: { type: typeParsed.data, filename, size: file.size, mimeType: file.type },
    ip,
    device,
  })

  return successResponse(
    {
      id: upload.id,
      path: upload.path,
      type: upload.type,
      size: upload.size,
      mimeType: upload.mimeType,
    },
    'File uploaded successfully',
    201
  )
}
