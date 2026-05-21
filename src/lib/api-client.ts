import { useAuthStore } from '@/stores/auth-store'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

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

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    const token = useAuthStore.getState().accessToken
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

  async get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })
    return res.json()
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  async upload<T = unknown>(
    path: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const token = useAuthStore.getState().accessToken
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

  getDownloadUrl(path: string): string {
    const token = useAuthStore.getState().accessToken
    return `${this.baseUrl}${path}${path.includes('?') ? '&' : '?'}token=${token}`
  }
}

export const apiClient = new ApiClient()

// Response type aliases
export interface ApiSuccessResponse<T> {
  success: true
  data: T
  message?: string
}

export interface ApiPaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}
