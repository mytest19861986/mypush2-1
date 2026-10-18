'use client'

import { useEffect, useState } from 'react'
import { Download, Share2, PlusSquare, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function SmartPwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    // Check standalone mode (PWA already running installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://')
      setIsStandalone(isStandaloneMode)
    }

    checkStandalone()

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(ua)
    setIsIOS(isIosDevice)

    // Listen for beforeinstallprompt (Android / Desktop Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setShowIosModal(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  if (!isMounted || isStandalone || isInstalled) {
    return null
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setIsInstalled(true)
        }
        setDeferredPrompt(null)
      } catch (err) {
        console.error('PWA install prompt error:', err)
      }
    } else if (isIOS) {
      setShowIosModal(true)
    } else {
      // Fallback for browsers that don't fire beforeinstallprompt yet or desktop
      setShowIosModal(true)
    }
  }

  return (
    <>
      <Button
        id="pwa-install-button"
        type="button"
        variant="outline"
        size="lg"
        onClick={handleInstallClick}
        className="group relative flex h-[52px] w-full items-center justify-center gap-2 rounded-full border-teal-200/90 bg-white/90 px-6 font-bold text-teal-800 shadow-sm transition-all hover:border-teal-400 hover:bg-teal-50/80 hover:text-teal-950 sm:w-auto"
        aria-label="نصب اپلیکیشن حامی‌کارت"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-teal-100 text-teal-700 transition-colors group-hover:bg-teal-200">
          <Download className="size-4" />
        </span>
        <span>نصب اپلیکیشن حامی‌کارت</span>
      </Button>

      {/* Modal for iOS and browser guidance */}
      {showIosModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6 shadow-2xl transition-all">
            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="absolute left-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="بستن راهنما"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                <Smartphone className="size-6" />
              </div>
              <div>
                <h3 id="pwa-install-title" className="text-lg font-black text-slate-900">
                  نصب اپلیکیشن حامی‌کارت
                </h3>
                <p className="text-xs text-slate-500">دسترسی سریع و بدون نیاز به دانلود از استور</p>
              </div>
            </div>

            <div className="mt-5 space-y-3.5 border-t border-slate-100 pt-4 text-sm text-slate-700">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                      ۱
                    </span>
                    <p className="leading-6">
                      در نوار پایین یا بالای مرورگر سافاری روی دکمه{' '}
                      <strong className="inline-flex items-center gap-1 font-bold text-teal-700">
                        اشتراک‌گذاری (Share) <Share2 className="inline size-4" />
                      </strong>{' '}
                      بزنید.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                      ۲
                    </span>
                    <p className="leading-6">
                      از منوی باز شده گزینه{' '}
                      <strong className="inline-flex items-center gap-1 font-bold text-teal-700">
                        افزودن به صفحه اصلی (Add to Home Screen) <PlusSquare className="inline size-4" />
                      </strong>{' '}
                      را انتخاب کنید.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                      ۳
                    </span>
                    <p className="leading-6">در گوشه بالا دکمه <strong>Add</strong> را لمس کنید تا آیکون حامی‌کارت به صفحه گوشی اضافه شود.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                      ۱
                    </span>
                    <p className="leading-6">
                      روی منوی سه‌نقطه مرورگر خود بزنید.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                      ۲
                    </span>
                    <p className="leading-6">
                      گزینه <strong>«نصب برنامه» (Install app)</strong> یا <strong>«افزودن به صفحه اصلی»</strong> را انتخاب فرمایید.
                    </p>
                  </div>
                </>
              )}
            </div>

            <Button
              type="button"
              className="mt-6 w-full rounded-2xl bg-teal-700 py-3 font-bold text-white hover:bg-teal-800"
              onClick={() => setShowIosModal(false)}
            >
              متوجه شدم
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
