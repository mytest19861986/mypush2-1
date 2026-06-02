import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BadgePercent,
  MapPin,
  RotateCcw,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { IRAN_PROVINCES, getCitiesByProvince } from '@/constants/iran-locations'
import { DoctorsFilterSidebar } from './doctors-filter-sidebar'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'پزشکان و مراکز درمانی طرف قرارداد | حامی کارت',
  description: 'فهرست پزشکان و مراکز درمانی طرف قرارداد حامی کارت با فیلتر شهر، استان و تخصص.',
}

type SortKey = 'discount' | 'newest'

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

  return doctors.map((doctor) => {
    const fullName = [doctor.user.profile?.firstName, doctor.user.profile?.lastName]
      .map(normalize)
      .filter(Boolean)
      .join(' ')

    return {
      id: doctor.id,
      fullName: fullName || 'پزشک طرف قرارداد',
      profileImageUrl: getSafePublicImageUrl(doctor.user.profile?.avatar),
      specialty: doctor.specialty,
      city: doctor.city,
      province: doctor.province,
      discountPercent: doctor.discountPercent,
      createdAt: doctor.createdAt,
    }
  })
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

function DoctorCard({ doctor }: { doctor: PublicDoctor }) {
  const location = getLocationLabel(doctor)
  const hasDiscount = typeof doctor.discountPercent === 'number' && doctor.discountPercent > 0

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex flex-row items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
          {doctor.profileImageUrl ? (
            <img
              src={doctor.profileImageUrl}
              alt={`تصویر پزشک ${doctor.fullName}`}
              className="size-full object-cover"
            />
          ) : (
            <div className="relative">
              <UserRound className="size-7" />
              <Stethoscope className="absolute -bottom-1 -left-2 size-4 rounded-full bg-teal-50 text-teal-700" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-black text-slate-950">{doctor.fullName}</h2>
          <p className="mt-1 min-h-6 text-sm font-semibold text-slate-500">
            {doctor.specialty || 'تخصص ثبت نشده'}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {location ? (
          <div className="flex min-h-6 items-center gap-2 text-sm font-medium text-slate-600">
            <MapPin className="size-4 shrink-0 text-teal-600" />
            <span>{location}</span>
          </div>
        ) : null}

        <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-orange-100 px-3 py-2 text-sm font-black text-orange-600">
          <BadgePercent className="size-4 shrink-0" />
          <span className="truncate">
            {hasDiscount
              ? `تخفیف این پزشک: ${toPersianDigits(doctor.discountPercent!)}٪`
              : 'درصد تخفیف ثبت نشده'}
          </span>
        </div>

        <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs font-semibold leading-6 text-slate-500">
          تخفیف‌ها بر اساس قرارداد هر پزشک متغیر است.
        </p>
      </div>

      <Button
        type="button"
        className="mt-5 h-11 w-full rounded-xl bg-orange-500 font-black text-white shadow-sm hover:bg-orange-600"
      >
        مشاهده اطلاعات
      </Button>
    </article>
  )
}

function DirectoryEmptyState({ hasDoctors }: { hasDoctors: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-teal-50 text-teal-700">
        <Stethoscope className="size-8" />
      </div>
      <p className="mt-5 font-black text-slate-900">
        {hasDoctors
          ? 'در حال حاضر پزشکی با این فیلتر پیدا نشد.'
          : 'در حال حاضر پزشکی برای نمایش ثبت نشده است.'}
      </p>
    </div>
  )
}

function DirectoryErrorState({ filters }: { filters: DoctorFilters }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-orange-50 text-orange-500">
        <RotateCcw className="size-8" />
      </div>
      <p className="mt-5 font-black text-slate-900">امکان بارگذاری فهرست پزشکان وجود ندارد.</p>
      <p className="mt-2 text-sm leading-7 text-slate-500">لطفا چند لحظه دیگر دوباره تلاش کنید.</p>
      <Button asChild className="mt-6 rounded-xl bg-orange-500 text-white hover:bg-orange-600">
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                <Skeleton className="size-14 rounded-2xl bg-teal-100" />
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
          <p className="text-base font-black text-slate-900">
            {toPersianDigits(filteredDoctors.length)} پزشک یافت شد
          </p>
          <p className="text-sm font-semibold text-slate-500">درصد تخفیف برای هر پزشک متفاوت است.</p>
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
    <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="mb-8 inline-flex text-sm font-black text-teal-700 hover:text-teal-800">
            بازگشت به حامی کارت
          </Link>
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <Stethoscope className="size-7" />
          </div>
          <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl lg:text-5xl">
            پزشکان و مراکز درمانی طرف قرارداد
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            از میان پزشکان متخصص و مراکز درمانی معتبر انتخاب کنید و با حامی‌کارت از تخفیف ویژه بهره‌مند شوید.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            حامی کارت بیمه درمانی نیست؛ یک پلتفرم عضویت و تخفیف خدمات پزشکی نزد پزشکان طرف قرارداد است.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Suspense key={JSON.stringify(filters)} fallback={<DirectoryLoading />}>
            <DirectoryContent filters={filters} />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
