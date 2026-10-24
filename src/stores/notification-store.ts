import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

export interface NotificationItem {
  id: string
  userId: string
  type: string
  title: string
  message: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  referenceId?: string | null
  link?: string | null
  read: boolean
  readAt?: string | null
  createdAt: string
}

interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  isLoading: boolean
  isMarkingAll: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }

  // Actions
  fetchUnreadCount: () => Promise<void>
  fetchNotifications: (page?: number, limit?: number, unreadOnly?: boolean) => Promise<void>
  markAsRead: (id: string) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
  reset: () => void
}

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isMarkingAll: false,
  error: null,
  pagination: DEFAULT_PAGINATION,

  fetchUnreadCount: async () => {
    try {
      const res = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count')
      if (res.success && res.data) {
        set({ unreadCount: res.data.unreadCount ?? 0 })
      }
    } catch (err: any) {
      // Keep silent on background count fetch failures to prevent noisy toast/alerts
    }
  },

  fetchNotifications: async (page = 1, limit = 20, unreadOnly = false) => {
    set({ isLoading: true, error: null })
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (unreadOnly) query.set('unreadOnly', 'true')

      const res = await apiClient.get<NotificationItem[]>(
        `/notifications?${query.toString()}`
      )

      if (res.success && res.data) {
        set({
          notifications: res.data,
          pagination: res.pagination || {
            page,
            limit,
            total: res.data.length,
            totalPages: Math.ceil(res.data.length / limit),
          },
          isLoading: false,
          error: null,
        })
      } else {
        const errorMsg = res.error?.message || 'خطا در بارگذاری اعلان‌ها.'
        set({
          isLoading: false,
          error: errorMsg,
        })
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'خطای شبکه در ارتباط با سرور اعلان‌ها.',
      })
    }
  },

  markAsRead: async (id: string) => {
    if (!id) return false
    // Optimistic check: if already read, no-op
    const existing = get().notifications.find((n) => n.id === id)
    if (existing?.read) return true

    try {
      await apiClient.request('PATCH', `/notifications/${id}/read`)
      // Update state locally
      set((state) => {
        const updatedList = state.notifications.map((n) =>
          n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
        const newUnread = Math.max(0, state.unreadCount - 1)
        return {
          notifications: updatedList,
          unreadCount: newUnread,
        }
      })
      return true
    } catch (err: any) {
      // In case of error, do not modify read state falsely
      return false
    }
  },

  markAllAsRead: async () => {
    if (get().unreadCount === 0 && get().notifications.every((n) => n.read)) {
      return true
    }

    set({ isMarkingAll: true })
    try {
      await apiClient.request('POST', '/notifications/read-all')
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          read: true,
          readAt: n.readAt || new Date().toISOString(),
        })),
        unreadCount: 0,
        isMarkingAll: false,
      }))
      return true
    } catch (err: any) {
      set({ isMarkingAll: false })
      return false
    }
  },

  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      isMarkingAll: false,
      error: null,
      pagination: DEFAULT_PAGINATION,
    })
  },
}))
