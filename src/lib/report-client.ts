import { ApiError } from '@/lib/api-client'

export function getReportErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'نشست شما معتبر نیست؛ دوباره وارد شوید. (۴۰۱)'
    if (error.status === 403) return 'مجوز مشاهدهٔ این گزارش را ندارید. (۴۰۳)'
    if (error.status === 404) return 'مسیر گزارش در نسخهٔ سرور موجود نیست. (۴۰۴)'
    if (error.status >= 500) return `سرور هنگام دریافت گزارش خطا داد. (${error.status.toLocaleString('fa-IR', { useGrouping: false })})`
    if (error.code === 'NON_JSON_RESPONSE' || error.code === 'JSON_PARSE_ERROR') return 'پاسخ سرور برای گزارش معتبر نیست.'
    return error.message
  }
  if (error instanceof TypeError) return 'ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.'
  return error instanceof Error ? error.message : 'دریافت گزارش ناموفق بود.'
}
