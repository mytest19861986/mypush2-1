import { useState, useEffect, useCallback, useRef } from 'react'

interface UseCountdownOptions {
  initialSeconds?: number
  onExpire?: () => void
}

export function useCountdown(options: UseCountdownOptions = {}) {
  const { initialSeconds = 120, onExpire } = options
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isActive, setIsActive] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    setSeconds(initialSeconds)
    setIsActive(true)
  }, [initialSeconds])

  const stop = useCallback(() => {
    setIsActive(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isActive) return

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setIsActive(false)
          onExpire?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive, onExpire])

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  const display = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

  return {
    seconds,
    display,
    isActive,
    isExpired: seconds === 0,
    start,
    stop,
    reset: start,
  }
}
