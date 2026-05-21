import { NextRequest } from 'next/server'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { validateFile, getFileExtension } from '@/lib/upload'
import { createAuditLog, AuditActions } from '@/lib/audit'

const validUploadTypes = ['AVATAR', 'DOCUMENT', 'GENERAL'] as const

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
