import { NextRequest } from 'next/server'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { validateFile, getFileExtension } from '@/lib/upload'
import { createAuditLog, AuditActions } from '@/lib/audit'

const validDocTypes = ['NATIONAL_CARD', 'BUSINESS_LICENSE', 'CERTIFICATE', 'OTHER'] as const

// POST /api/v1/agents/documents — Upload agent document
export async function POST(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  // Check user has AGENT role
  if (!payload!.roles.includes('AGENT')) {
    return errorResponse('FORBIDDEN', 'AGENT role required', 403)
  }

  const formData = await request.formData()
  const docType = formData.get('type') as string | null
  const file = formData.get('file') as File | null

  if (!docType) {
    return errorResponse('VALIDATION_ERROR', 'Document type is required', 400)
  }

  const typeParsed = z.enum(validDocTypes).safeParse(docType)
  if (!typeParsed.success) {
    return errorResponse('VALIDATION_ERROR', `Invalid document type. Must be one of: ${validDocTypes.join(', ')}`, 400)
  }

  if (!file) {
    return errorResponse('VALIDATION_ERROR', 'File is required', 400)
  }

  // Validate file
  const validation = validateFile(file)
  if (!validation.valid) {
    return errorResponse('VALIDATION_ERROR', validation.error!, 400)
  }

  // Get or find agent record
  const agent = await db.agent.findUnique({
    where: { userId: payload!.sub },
  })
  if (!agent) {
    return errorResponse('NOT_FOUND', 'Agent record not found', 404)
  }

  // Generate file path and save
  const extension = getFileExtension(file.type)
  const timestamp = Date.now()
  const randomId = crypto.randomUUID().slice(0, 8)
  const filename = `${timestamp}-${randomId}.${extension}`
  const agentDir = path.join(process.cwd(), 'private-uploads', 'agents', agent.id)

  // Ensure directory exists
  await mkdir(agentDir, { recursive: true })

  const filePath = path.join(agentDir, filename)
  const relativePath = `agents/${agent.id}/${filename}`

  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))

  // Create AgentDocument record
  const document = await db.agentDocument.create({
    data: {
      agentId: agent.id,
      type: typeParsed.data,
      file: relativePath,
      status: 'PENDING',
    },
  })

  // Create Upload record
  await db.upload.create({
    data: {
      userId: payload!.sub,
      path: relativePath,
      type: 'DOCUMENT',
      size: file.size,
      mimeType: file.type,
    },
  })

  // Create audit log
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  const device = request.headers.get('user-agent') || undefined
  createAuditLog({
    userId: payload!.sub,
    action: AuditActions.DOCUMENT_UPLOADED,
    entity: 'AgentDocument',
    entityId: document.id,
    details: { agentId: agent.id, type: typeParsed.data, filename, size: file.size },
    ip,
    device,
  })

  return successResponse(document, 'Document uploaded successfully', 201)
}

// GET /api/v1/agents/documents — List current agent's documents
export async function GET(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  // Check user has AGENT role
  if (!payload!.roles.includes('AGENT')) {
    return errorResponse('FORBIDDEN', 'AGENT role required', 403)
  }

  const agent = await db.agent.findUnique({
    where: { userId: payload!.sub },
  })
  if (!agent) {
    return errorResponse('NOT_FOUND', 'Agent record not found', 404)
  }

  const documents = await db.agentDocument.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: 'desc' },
    include: {
      reviewer: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  return successResponse(documents, 'Documents retrieved')
}
