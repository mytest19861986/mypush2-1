'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard hydration guard for next-themes
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-9">
        <Sun className="size-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="تغییر تم"
    >
      {theme === 'dark' ? (
        <Sun className="size-4 text-yellow-400" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  )
}
