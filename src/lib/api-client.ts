import type { ApiErrorBody, ApiResponse, PaginatedResponse } from '@/types'

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
    this.name = 'ApiError'
  }
}

class ApiClient {
  private baseUrl = '/api/v1'

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    const token = this.getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })

    const json = await res.json() as ApiResponse<T>

    if (!res.ok || !json.success) {
      throw new ApiError(
        json.error?.code || 'UNKNOWN_ERROR',
        json.error?.message || json.message || 'خطای ناشناخته',
        res.status
      )
    }

    return json.data as T
  }

  /**
   * GET requests return the full API envelope.
   *
   * Consumers should check `response.success`, read `response.data`, and use
   * `response.pagination` when present.
   */
  async get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })
    return res.json()
  }

  /**
   * POST requests return only the response `data` payload.
   *
   * On non-2xx responses or `{ success: false }`, this throws `ApiError`.
   */
  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  /**
   * PUT requests return only the response `data` payload.
   *
   * On non-2xx responses or `{ success: false }`, this throws `ApiError`.
   */
  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  /**
   * PATCH requests return only the response `data` payload.
   *
   * On non-2xx responses or `{ success: false }`, this throws `ApiError`.
   */
  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }

  /**
   * DELETE requests return only the response `data` payload.
   *
   * On non-2xx responses or `{ success: false }`, this throws `ApiError`.
   */
  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  /**
   * Upload requests return the full API envelope.
   *
   * On non-2xx responses or `{ success: false }`, this throws `ApiError`.
   * Consumers can check `response.success` and read `response.data`.
   */
  async upload<T = unknown>(
    path: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const token = this.getAccessToken()
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${this.baseUrl}${path}`)

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            onProgress(percent)
          }
        }
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText) as ApiResponse<T>
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            resolve(data)
          } else {
            reject(new ApiError(
              data.error?.code || 'UPLOAD_ERROR',
              data.error?.message || 'خطا در آپلود فایل',
              xhr.status
            ))
          }
        } catch {
          reject(new Error('خطا در پردازش پاسخ سرور'))
        }
      }

      xhr.onerror = () => {
        reject(new Error('خطا در ارتباط با سرور'))
      }

      xhr.send(formData)
    })
  }

  /**
   * @deprecated Do not pass auth tokens in URLs. Prefer `fetch` with an
   * Authorization header for downloads.
   */
  getDownloadUrl(path: string): string {
    const token = this.getAccessToken()
    return `${this.baseUrl}${path}${path.includes('?') ? '&' : '?'}token=${token}`
  }
}

export const apiClient = new ApiClient()

// Response type aliases
export type { ApiResponse, PaginatedResponse } from '@/types'

export type ApiSuccessResponse<T> = {
  success: true
  data: T
  message?: string
}

export type ApiPaginatedResponse<T> = PaginatedResponse<T>

export type ApiErrorResponse = {
  success: false
  error: ApiErrorBody
}
