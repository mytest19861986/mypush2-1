export type PayoutInput = {
  cardNumber?: string | null
  sheba?: string | null
  accountOwnerName?: string | null
}

export type PayoutValidationOptions = {
  requireCardNumber?: boolean
  requireSheba?: boolean
}

export type NormalizedPayoutUpdate = {
  values: {
    payoutCardNumber?: string | null
    payoutSheba?: string | null
    payoutAccountOwnerName?: string | null
  }
  errors: string[]
}

const persianDigitMap: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
}

export function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => persianDigitMap[digit] ?? digit)
}

export function normalizeCardNumber(value: string) {
  return normalizeDigits(value).replace(/[\s-]/g, '')
}

export function normalizeSheba(value: string) {
  const compact = normalizeDigits(value).replace(/[\s-]/g, '').toUpperCase()
  if (!compact) return ''
  return compact.startsWith('IR') ? compact : `IR${compact}`
}

export function maskCardNumber(cardNumber?: string | null) {
  if (!cardNumber) return null
  const normalized = normalizeCardNumber(cardNumber)
  if (normalized.length <= 4) return normalized
  return `${'*'.repeat(Math.max(normalized.length - 4, 0))}${normalized.slice(-4)}`
}

export function maskSheba(sheba?: string | null) {
  if (!sheba) return null
  const normalized = normalizeSheba(sheba)
  if (normalized.length <= 6) return normalized
  return `${normalized.slice(0, 2)}${'*'.repeat(Math.max(normalized.length - 6, 0))}${normalized.slice(-4)}`
}

export function normalizePayoutUpdate(
  input: PayoutInput,
  options: PayoutValidationOptions = {}
): NormalizedPayoutUpdate {
  const values: NormalizedPayoutUpdate['values'] = {}
  const errors: string[] = []

  if (Object.prototype.hasOwnProperty.call(input, 'cardNumber')) {
    const cardNumber = normalizeCardNumber(input.cardNumber ?? '')
    if (!cardNumber) {
      if (options.requireCardNumber) {
        errors.push('شماره کارت الزامی است.')
      }
      values.payoutCardNumber = null
    } else if (!/^\d{16}$/.test(cardNumber)) {
      errors.push('شماره کارت باید ۱۶ رقم باشد.')
    } else {
      values.payoutCardNumber = cardNumber
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'sheba')) {
    const sheba = normalizeSheba(input.sheba ?? '')
    if (!sheba) {
      if (options.requireSheba) {
        errors.push('شماره شبا الزامی است.')
      }
      values.payoutSheba = null
    } else if (!/^IR\d{24}$/.test(sheba)) {
      errors.push('شماره شبا باید با فرمت معتبر ایران و شامل ۲۴ رقم باشد.')
    } else {
      values.payoutSheba = sheba
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'accountOwnerName')) {
    const accountOwnerName = (input.accountOwnerName ?? '').trim()
    if (accountOwnerName.length > 100) {
      errors.push('نام صاحب حساب حداکثر می‌تواند ۱۰۰ کاراکتر باشد.')
    } else {
      values.payoutAccountOwnerName = accountOwnerName || null
    }
  }

  return { values, errors }
}
