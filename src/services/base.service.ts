import { apiClient, ApiError, type ApiResponse, type PaginatedResponse } from '@/lib/api-client'

export class BaseService {
  protected client = apiClient

  protected async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.client.get<T>(path)
  }

  protected async post<T>(path: string, body?: unknown): Promise<T> {
    return this.client.post<T>(path, body)
  }

  protected async put<T>(path: string, body?: unknown): Promise<T> {
    return this.client.put<T>(path, body)
  }

  protected async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.client.patch<T>(path, body)
  }

  protected async delete<T>(path: string): Promise<T> {
    return this.client.delete<T>(path)
  }

  protected async upload<T>(path: string, formData: FormData, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    return this.client.upload<T>(path, formData, onProgress)
  }
}
