import Link from 'next/link'
import { Banknote, Info, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TransactionsManagement() {
  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">دفتر تراکنش‌های کیف پول</h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          این صفحه فقط برای نمایش تراکنش‌های واقعی ثبت‌شده در دفتر WalletTransaction است.
        </p>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-5 text-teal-600" />
            تراکنش‌های ثبت‌شده کیف پول
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Info className="size-7" />
          </div>
          <div className="max-w-2xl space-y-2">
            <p className="text-sm font-bold text-foreground">
              تراکنش واقعی برای نمایش در این بخش وجود ندارد.
            </p>
            <p className="text-sm leading-7 text-muted-foreground">
              این بخش فقط تراکنش‌های ثبت‌شده کیف پول را نمایش می‌دهد. پورسانت‌ها و موجودی قابل برداشت از بخش پورسانت و تسویه قابل مشاهده هستند.
            </p>
          </div>
          <Button asChild className="mt-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/admin/financial-management">
              <Banknote className="size-4" />
              مشاهده بخش پورسانت و تسویه
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
