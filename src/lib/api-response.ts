// Standard API response helpers for consistent API responses across the application.

interface SuccessResponse<T> {
  success: true
  data: T
  message: string
}

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: PaginationMeta
}

/**
 * Return a standardized success JSON response.
 */
export function successResponse<T>(
  data: T,
  message = '',
  statusCode = 200
): Response {
  return Response.json(
    { success: true, data, message } satisfies SuccessResponse<T>,
    { status: statusCode }
  )
}

/**
 * Return a standardized error JSON response.
 */
export function errorResponse(
  code: string,
  message: string,
  statusCode = 400
): Response {
  return Response.json(
    { success: false, error: { code, message } } satisfies ErrorResponse,
    { status: statusCode }
  )
}

/**
 * Return a paginated JSON response with metadata.
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number; totalPages: number }
): Response {
  return Response.json(
    { success: true, data, pagination } satisfies PaginatedResponse<T>
  )
}

export type { SuccessResponse, ErrorResponse, PaginationMeta, PaginatedResponse }
