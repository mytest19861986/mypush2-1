// Matches the existing doctor-registration mission's 1–10 digit contract.
export function normalizeMedicalCode(value: string) {
  return value.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).trim()
}

export const medicalCodePattern = /^\d{1,10}$/
export const medicalCodeValidationMessage = 'کد نظام پزشکی باید شامل ۱ تا ۱۰ رقم باشد.'
