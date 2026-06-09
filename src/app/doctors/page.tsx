import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { readFile } from 'fs/promises'
import path from 'path'
import {
  ArrowRight,
  BadgePercent,
  MapPin,
  RotateCcw,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { IRAN_PROVINCES, getCitiesByProvince } from '@/constants/iran-locations'
import { DoctorsFilterSidebar } from './doctors-filter-sidebar'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'پزشکان و مراکز درمانی طرف قرارداد | حامی کارت',
  description: 'فهرست پزشکان و مراکز درمانی طرف قرارداد حامی کارت با فیلتر شهر، استان و تخصص.',
}

type SortKey = 'discount' | 'newest'

const publicAvatarMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

type DoctorFilters = {
  q?: string
  specialty?: string
  province?: string
  city?: string
  sort: SortKey
}

type PublicDoctor = {
  id: string
  fullName: string
  profileImageUrl: string | null
  specialty: string | null
  city: string | null
  province: string | null
  discountPercent: number | null
  createdAt: Date
}

const allValue = 'all'

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function normalize(value?: string | null) {
  return (value || '').trim()
}

function cleanFilterValue(value?: string | null) {
  const normalized = normalize(value)
  return normalized && normalized !== allValue ? normalized : ''
}

function toPersianDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
}

function buildFilters(searchParams?: Record<string, string | string[] | undefined>): DoctorFilters {
  const sort = getParam(searchParams?.sort)
  const province = cleanFilterValue(getParam(searchParams?.province))
  const city = cleanFilterValue(getParam(searchParams?.city))
  const cityBelongsToProvince = province
    ? getCitiesByProvince(province).includes(city)
    : false

  return {
    q: normalize(getParam(searchParams?.q)),
    specialty: cleanFilterValue(getParam(searchParams?.specialty)),
    province,
    city: cityBelongsToProvince ? city : '',
    sort: sort === 'newest' ? 'newest' : 'discount',
  }
}

function buildDoctorsHref(filters: DoctorFilters, overrides: Partial<DoctorFilters> = {}) {
  const nextFilters = { ...filters, ...overrides }
  const params = new URLSearchParams()

  if (nextFilters.q) params.set('q', nextFilters.q)
  if (nextFilters.specialty) params.set('specialty', nextFilters.specialty)
  if (nextFilters.province) params.set('province', nextFilters.province)
  if (nextFilters.city) params.set('city', nextFilters.city)
  if (nextFilters.sort !== 'discount') params.set('sort', nextFilters.sort)

  return `/doctors${params.toString() ? `?${params.toString()}` : ''}`
}

function getSafePublicImageUrl(value?: string | null) {
  const url = normalize(value)
  if (!url) return null

  if (url.startsWith('/') && !url.startsWith('//')) {
    const lowerUrl = url.toLowerCase()
    if (
      lowerUrl.startsWith('/api/') ||
      lowerUrl.startsWith('/api/v1/') ||
      lowerUrl.startsWith('/private-uploads/') ||
      lowerUrl.startsWith('/uploads/')
    ) {
      return null
    }

    return url
  }

  try {
    const parsedUrl = new URL(url)
    return ['http:', 'https:'].includes(parsedUrl.protocol) ? url : null
  } catch {
    return null
  }
}

async function getDoctorAvatarDataUrl(userId: string, avatarPath?: string | null) {
  const normalizedPath = normalize(avatarPath)
  if (!normalizedPath) return null

  const upload = await db.upload.findFirst({
    where: {
      userId,
      path: normalizedPath,
      type: 'AVATAR',
    },
    select: {
      path: true,
      mimeType: true,
    },
  })

  if (!upload || !publicAvatarMimeTypes.has(upload.mimeType)) {
    return null
  }

  const uploadsRoot = path.resolve(process.cwd(), 'private-uploads')
  const filePath = path.resolve(uploadsRoot, upload.path)
  const relativePath = path.relative(uploadsRoot, filePath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null
  }

  try {
    const fileBuffer = await readFile(filePath)
    return `data:${upload.mimeType};base64,${fileBuffer.toString('base64')}`
  } catch {
    return null
  }
}

async function getPublicDoctors(): Promise<PublicDoctor[]> {
  const doctors = await db.doctor.findMany({
    where: {
      status: 'APPROVED',
      user: {
        status: 'ACTIVE',
      },
    },
    select: {
      id: true,
      userId: true,
      specialty: true,
      city: true,
      province: true,
      discountPercent: true,
      createdAt: true,
      user: {
        select: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return Promise.all(doctors.map(async (doctor) => {
    const fullName = [doctor.user.profile?.firstName, doctor.user.profile?.lastName]
      .map(normalize)
      .filter(Boolean)
      .join(' ')
    const avatar = doctor.user.profile?.avatar

    return {
      id: doctor.id,
      fullName: fullName || 'پزشک طرف قرارداد',
      profileImageUrl:
        (await getDoctorAvatarDataUrl(doctor.userId, avatar)) || getSafePublicImageUrl(avatar),
      specialty: doctor.specialty,
      city: doctor.city,
      province: doctor.province,
      discountPercent: doctor.discountPercent,
      createdAt: doctor.createdAt,
    }
  }))
}

function getLocationLabel(doctor: PublicDoctor) {
  return [doctor.province, doctor.city].map(normalize).filter(Boolean).join('، ')
}

function getUniqueOptions(values: string[]) {
  return Array.from(new Set(values.map(normalize).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'fa')
  )
}

function filterDoctors(doctors: PublicDoctor[], filters: DoctorFilters) {
  const query = normalize(filters.q).toLocaleLowerCase('fa-IR')

  const filtered = doctors.filter((doctor) => {
    const searchableText = [
      doctor.fullName,
      doctor.specialty,
      doctor.province,
      doctor.city,
    ]
      .map(normalize)
      .join(' ')
      .toLocaleLowerCase('fa-IR')

    return (
      (!query || searchableText.includes(query)) &&
      (!filters.specialty || doctor.specialty === filters.specialty) &&
      (!filters.province || doctor.province === filters.province) &&
      (!filters.city || doctor.city === filters.city)
    )
  })

  return filtered.sort((first, second) => {
    if (filters.sort === 'newest') {
      return second.createdAt.getTime() - first.createdAt.getTime()
    }

    return (second.discountPercent || 0) - (first.discountPercent || 0)
  })
}

function DoctorDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-foreground">{value}</p>
    </div>
  )
}

function DoctorCard({ doctor }: { doctor: PublicDoctor }) {
  const location = getLocationLabel(doctor)
  const hasDiscount = typeof doctor.discountPercent === 'number' && doctor.discountPercent > 0
  const discountLabel = hasDiscount
    ? `${toPersianDigits(doctor.discountPercent!)}٪`
    : 'درصد تخفیف ثبت نشده'

  return (
    <article className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      <div className="flex flex-row items-center gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-50 text-teal-700 ring-1 ring-border/70">
          {doctor.profileImageUrl ? (
            <img
              src={doctor.profileImageUrl}
              alt={`تصویر پزشک ${doctor.fullName}`}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center">
              <UserRound className="size-9" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold text-foreground">{doctor.fullName}</h2>
          <p className="mt-1 min-h-6 text-sm text-muted-foreground">
            {doctor.specialty || 'تخصص ثبت نشده'}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {location ? (
          <div className="flex min-h-6 items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            <span>{location}</span>
          </div>
        ) : null}

        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          <BadgePercent className="size-4 shrink-0" />
          <span className="truncate">
            {hasDiscount
              ? `تخفیف این پزشک: ${toPersianDigits(doctor.discountPercent!)}٪`
              : 'درصد تخفیف ثبت نشده'}
          </span>
        </div>

        <p className="rounded-xl bg-muted/50 px-3 py-3 text-xs font-medium leading-6 text-muted-foreground">
          تخفیف‌ها بر اساس قرارداد هر پزشک متغیر است.
        </p>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            className="mt-5 h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            مشاهده اطلاعات
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl" className="sm:max-w-xl">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>اطلاعات پزشک</DialogTitle>
            <DialogDescription>
              اطلاعات عمومی پزشک طرف قرارداد حامی کارت
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-50 text-teal-700 ring-1 ring-border/70">
                {doctor.profileImageUrl ? (
                  <img
                    src={doctor.profileImageUrl}
                    alt={`تصویر پزشک ${doctor.fullName}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound className="size-9" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-7 text-foreground">{doctor.fullName}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {doctor.specialty || 'تخصص ثبت نشده'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DoctorDetailRow label="نام پزشک" value={doctor.fullName} />
              <DoctorDetailRow label="تخصص" value={doctor.specialty || 'ثبت نشده'} />
              <DoctorDetailRow label="درصد تخفیف" value={discountLabel} />
              <DoctorDetailRow label="استان / شهر" value={location || 'ثبت نشده'} />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl">
                بستن
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}

function DirectoryEmptyState({ hasDoctors }: { hasDoctors: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center shadow-sm">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-teal-50 text-teal-700">
        <Stethoscope className="size-8" />
      </div>
      <p className="mt-5 font-bold text-foreground">
        {hasDoctors
          ? 'در حال حاضر پزشکی با این فیلتر پیدا نشد.'
          : 'در حال حاضر پزشکی برای نمایش ثبت نشده است.'}
      </p>
    </div>
  )
}

function DirectoryErrorState({ filters }: { filters: DoctorFilters }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <RotateCcw className="size-8" />
      </div>
      <p className="mt-5 font-bold text-foreground">امکان بارگذاری فهرست پزشکان وجود ندارد.</p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">لطفا چند لحظه دیگر دوباره تلاش کنید.</p>
      <Button asChild className="mt-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
        <Link href={buildDoctorsHref(filters)}>
          <RotateCcw className="size-4" />
          تلاش دوباره
        </Link>
      </Button>
    </div>
  )
}

function DirectoryLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[25%_1fr] lg:items-start">
      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
        <Skeleton className="h-8 w-24" />
        <div className="mt-6 space-y-5">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>
      </div>

      <div>
        <Skeleton className="mb-5 h-6 w-36" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <Skeleton className="size-20 rounded-full bg-teal-100" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-10 w-40 rounded-full" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function DirectoryContent({ filters }: { filters: DoctorFilters }) {
  let doctors: PublicDoctor[]

  try {
    doctors = await getPublicDoctors()
  } catch (error) {
    console.error('[Doctors Directory]', error)
    return (
      <div className="grid gap-6 lg:grid-cols-[25%_1fr] lg:items-start">
        <DoctorsFilterSidebar
          key={JSON.stringify(filters)}
          filters={filters}
          specialties={[]}
          provinceCities={IRAN_PROVINCES}
        />
        <DirectoryErrorState filters={filters} />
      </div>
    )
  }

  const specialties = getUniqueOptions(doctors.map((doctor) => doctor.specialty || ''))
  const filteredDoctors = filterDoctors(doctors, filters)

  return (
    <div className="grid gap-6 lg:grid-cols-[25%_1fr] lg:items-start">
      <DoctorsFilterSidebar
        key={JSON.stringify(filters)}
        filters={filters}
        specialties={specialties}
        provinceCities={IRAN_PROVINCES}
      />

      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-bold text-foreground">
            {toPersianDigits(filteredDoctors.length)} پزشک یافت شد
          </p>
          <p className="text-sm font-medium text-muted-foreground">درصد تخفیف برای هر پزشک متفاوت است.</p>
        </div>

        {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        ) : (
          <DirectoryEmptyState hasDoctors={doctors.length > 0} />
        )}
      </section>
    </div>
  )
}

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const filters = buildFilters(resolvedSearchParams)

  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/60 bg-card px-4 py-10 text-center sm:px-6 md:py-12 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Button asChild variant="outline" className="mb-5 h-10 rounded-xl border-primary/20 bg-background font-bold text-primary hover:bg-primary/5 hover:text-primary">
            <Link href="/">
              <ArrowRight className="size-4" />
              بازگشت به حامی کارت
            </Link>
          </Button>
          <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <Stethoscope className="size-6" />
          </div>
          <h1 className="text-2xl font-bold leading-tight text-foreground md:text-3xl">
            پزشکان و مراکز درمانی طرف قرارداد
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            از میان پزشکان متخصص و مراکز درمانی معتبر انتخاب کنید و با حامی‌کارت از تخفیف ویژه بهره‌مند شوید.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-xs leading-6 text-muted-foreground md:text-sm">
            حامی کارت بیمه درمانی نیست؛ یک پلتفرم عضویت و تخفیف خدمات پزشکی نزد پزشکان طرف قرارداد است.
          </p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Suspense key={JSON.stringify(filters)} fallback={<DirectoryLoading />}>
            <DirectoryContent filters={filters} />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
