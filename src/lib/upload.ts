// Upload security utilities for validating and managing file uploads.

/** Allowed MIME types for uploaded files */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
] as const

/** Maximum allowed file size in bytes (5MB) */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Validate an uploaded file against security rules.
 * Checks MIME type and file size.
 */
export function validateFile(
  file: File
): { valid: boolean; error?: string } {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Invalid file type '${file.type}'. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const maxMB = MAX_FILE_SIZE / (1024 * 1024)
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum limit of ${maxMB}MB`,
    }
  }

  // Check for empty file
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    }
  }

  return { valid: true }
}

/**
 * Map a MIME type to its file extension.
 */
export function getFileExtension(mimeType: string): string {
  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'application/pdf': 'pdf',
  }

  return extensionMap[mimeType] || 'bin'
}

/**
 * Generate a unique file path for an uploaded file.
 * Format: uploads/{userId}/{type}/{timestamp}-{randomId}.{ext}
 */
export function generateFilePath(
  userId: string,
  type: string,
  extension: string
): string {
  const timestamp = Date.now()
  const randomId = crypto.randomUUID().slice(0, 8)
  return `uploads/${userId}/${type}/${timestamp}-${randomId}.${extension}`
}

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE }
