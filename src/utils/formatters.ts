/**
 * Convert Latin digits to Persian/Arabic digits
 */
export function toPersianNum(value: number | string): string {
  return value.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)])
}

/**
 * Format price in Toman with Persian digits and thousand separators
 */
export function formatPrice(amount: number): string {
  const formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '،')
  return toPersianNum(formatted)
}

/**
 * Format price with "تومان" suffix
 */
export function formatPriceWithUnit(amount: number): string {
  return `${formatPrice(amount)} تومان`
}

/**
 * Format date to Persian locale
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fa-IR')
}

/**
 * Format date + time to Persian locale
 */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format relative time (e.g., "2 ساعت پیش")
 */
export function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'همین الان'
  if (diffMin < 60) return `${toPersianNum(diffMin)} دقیقه پیش`
  if (diffHour < 24) return `${toPersianNum(diffHour)} ساعت پیش`
  if (diffDay < 30) return `${toPersianNum(diffDay)} روز پیش`
  return formatDate(dateStr)
}

/**
 * Get user display name from profile
 */
export function getDisplayName(user?: { profile?: { firstName: string | null; lastName: string | null } | null; mobile?: string } | null): string {
  if (!user) return 'کاربر'
  const { profile } = user
  if (profile?.firstName || profile?.lastName) {
    return `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
  }
  return user.mobile || 'کاربر'
}

/**
 * Get user initials for Avatar
 */
export function getUserInitials(user?: { profile?: { firstName: string | null; lastName: string | null } | null; mobile?: string } | null): string {
  if (!user) return 'م'
  const { profile } = user
  if (profile?.firstName && profile?.lastName) {
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`
  }
  if (profile?.firstName) return profile.firstName.charAt(0)
  if (profile?.lastName) return profile.lastName.charAt(0)
  return (user.mobile || 'م').slice(-2)
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Validate Iranian mobile number
 */
export function isValidIranianMobile(mobile: string): boolean {
  return /^09[0-9]{9}$/.test(mobile)
}

/**
 * Validate Iranian national code
 */
export function isValidNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code)) return false
  const check = parseInt(code[9])
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(code[i]) * (10 - i)
  }
  const remainder = sum % 11
  return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder)
}
