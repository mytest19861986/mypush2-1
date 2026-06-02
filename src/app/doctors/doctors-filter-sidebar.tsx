'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SortKey = 'discount' | 'newest'

type DoctorFilters = {
  q?: string
  specialty?: string
  province?: string
  city?: string
  sort: SortKey
}

type DoctorsFilterSidebarProps = {
  filters: DoctorFilters
  specialties: string[]
  provinceCities: Record<string, string[]>
}

const allValue = 'all'

function SortButton({
  activeSort,
  value,
  label,
  onSelect,
}: {
  activeSort: SortKey
  value: SortKey
  label: string
  onSelect: (value: SortKey) => void
}) {
  const isActive = activeSort === value

  return (
    <Button
      type="button"
      variant={isActive ? 'default' : 'outline'}
      onClick={() => onSelect(value)}
      className={
        isActive
          ? 'h-10 rounded-xl bg-teal-600 px-4 font-black text-white shadow-md shadow-teal-600/15 hover:bg-teal-700'
          : 'h-10 rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700'
      }
    >
      {label}
    </Button>
  )
}

export function DoctorsFilterSidebar({
  filters,
  specialties,
  provinceCities,
}: DoctorsFilterSidebarProps) {
  const [selectedProvince, setSelectedProvince] = useState(filters.province || allValue)
  const [selectedCity, setSelectedCity] = useState(filters.city || allValue)
  const [activeSort, setActiveSort] = useState<SortKey>(filters.sort)

  const provinceNames = useMemo(() => Object.keys(provinceCities), [provinceCities])
  const cityOptions = useMemo(
    () => (selectedProvince === allValue ? [] : provinceCities[selectedProvince] || []),
    [provinceCities, selectedProvince]
  )
  const hasProvince = selectedProvince !== allValue
  const selectedCityValue =
    hasProvince && selectedCity !== allValue && cityOptions.includes(selectedCity)
      ? selectedCity
      : allValue

  return (
    <aside className="lg:sticky lg:top-24">
      <form action="/doctors" method="GET" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <input type="hidden" name="sort" value={activeSort} />

        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">فیلترها</h2>
          <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
            <Filter className="size-5" />
          </span>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">جستجوی نام پزشک</span>
            <span className="relative block">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="q"
                defaultValue={filters.q}
                placeholder="نام پزشک..."
                className="h-11 rounded-xl border-slate-200 bg-slate-50 pr-10 text-right focus-visible:border-teal-300 focus-visible:ring-teal-100"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">تخصص</span>
            <select
              name="specialty"
              defaultValue={filters.specialty || allValue}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
            >
              <option value={allValue}>همه تخصص‌ها</option>
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">استان</span>
            <select
              name="province"
              value={selectedProvince}
              onChange={(event) => {
                const nextProvince = event.target.value
                setSelectedProvince(nextProvince)
                setSelectedCity(allValue)
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
            >
              <option value={allValue}>همه استان‌ها</option>
              {provinceNames.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">شهر</span>
            <select
              name="city"
              value={selectedCityValue}
              disabled={!hasProvince}
              onChange={(event) => setSelectedCity(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition disabled:text-slate-400 focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
            >
              <option value={allValue}>همه شهرها</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-2 block text-sm font-bold text-slate-700">مرتب‌سازی بر اساس</span>
            <div className="flex flex-wrap gap-2">
              <SortButton activeSort={activeSort} value="discount" label="بیشترین تخفیف" onSelect={setActiveSort} />
              <SortButton activeSort={activeSort} value="newest" label="جدیدترین" onSelect={setActiveSort} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button type="submit" className="h-11 rounded-xl bg-orange-500 font-black text-white hover:bg-orange-600">
            اعمال فیلتر
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50">
            <Link href="/doctors">پاک کردن</Link>
          </Button>
        </div>
      </form>
    </aside>
  )
}
