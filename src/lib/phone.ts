/**
 * Phone number normalization utilities
 * Converts Persian/Arabic digits to ASCII and handles +98, 0098, 98, or 9xxxxxxxxx formats into standard 09xxxxxxxxx.
 */

export function normalizeMobile(input: string): string {
  if (!input) return ''

  // Convert Persian and Arabic digits to ASCII
  let cleaned = input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .trim()

  // Remove leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1)
  }

  // Handle 0098... -> 0...
  if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.slice(4)
  }
  // Handle 98... -> 0...
  else if (cleaned.startsWith('98') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2)
  }
  // Handle 9xxxxxxxxx (10 digits) -> 09xxxxxxxxx
  else if (cleaned.startsWith('9') && cleaned.length === 10) {
    cleaned = '0' + cleaned
  }

  return cleaned
}

export function isValidNormalizedMobile(mobile: string): boolean {
  return /^09\d{9}$/.test(mobile)
}
