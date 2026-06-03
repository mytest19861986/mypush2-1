'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

interface FilterOption {
  value: string
  label: string
}

interface SearchFilterBarProps {
  searchPlaceholder?: string
  onSearch: (value: string) => void
  filterOptions?: FilterOption[]
  filterValue?: string
  onFilterChange?: (value: string) => void
  filterPlaceholder?: string
  children?: React.ReactNode
}

export function SearchFilterBar({
  searchPlaceholder = 'جستجو...',
  onSearch,
  filterOptions,
  filterValue,
  onFilterChange,
  filterPlaceholder = 'همه',
  children,
}: SearchFilterBarProps) {
  const [searchInput, setSearchInput] = useState('')

  const handleSearch = () => {
    onSearch(searchInput)
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full gap-2 md:max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pr-10"
              />
            </div>
            <Button onClick={handleSearch} variant="secondary">
              جستجو
            </Button>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:justify-end">
            {filterOptions && onFilterChange && (
              <Select value={filterValue} onValueChange={onFilterChange}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder={filterPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
