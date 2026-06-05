import Image from 'next/image'

import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  imageClassName?: string
  showText?: boolean
  priority?: boolean
}

export function BrandLogo({
  className,
  imageClassName,
  showText = false,
  priority = false,
}: BrandLogoProps) {
  return (
    <div
      className={cn('flex items-center gap-3 text-right text-foreground', className)}
      dir="rtl"
    >
      <Image
        src="/brand/logo.png"
        alt="لوگوی حامی کارت"
        width={1772}
        height={1772}
        priority={priority}
        className={cn('h-10 w-auto shrink-0 object-contain', imageClassName)}
      />

      {showText && (
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-bold text-current">حامی کارت</span>
          <span className="truncate text-xs text-current opacity-70">
            سامانه تخفیف درمانی
          </span>
        </div>
      )}
    </div>
  )
}
