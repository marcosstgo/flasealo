import React from 'react'
import { Search, Calendar, ArrowUpDown, X } from 'lucide-react'

export type DateFilter = 'all' | 'today' | 'week' | 'month'
export type SortOrder = 'newest' | 'oldest' | 'name'

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  dateFilter: DateFilter
  onDateFilterChange: (filter: DateFilter) => void
  sortOrder: SortOrder
  onSortOrderChange: (order: SortOrder) => void
  totalPhotos: number
  filteredCount: number
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  sortOrder,
  onSortOrderChange,
  totalPhotos,
  filteredCount,
}: FilterBarProps) {
  const hasActiveFilters = searchQuery !== '' || dateFilter !== 'all' || sortOrder !== 'newest'

  const clearFilters = () => {
    onSearchChange('')
    onDateFilterChange('all')
    onSortOrderChange('newest')
  }

  return (
    <div className="sticky top-14 z-10 dark:bg-[#0d0d0d] bg-[#faf9f7] border-b dark:border-white/10 border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-white/30 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full dark:bg-white/5 bg-white dark:border dark:border-white/10 border border-gray-200 dark:text-white text-gray-900 dark:placeholder-white/30 placeholder-gray-400 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none dark:focus:border-white/30 focus:border-gray-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-white/40 dark:hover:text-white/70 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 dark:text-white/30 text-gray-400 md:hidden" />
            <select
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value as DateFilter)}
              className="dark:bg-white/5 bg-white dark:border dark:border-white/10 border border-gray-200 dark:text-white text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none dark:focus:border-white/30 focus:border-gray-400 transition-colors cursor-pointer"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 dark:text-white/30 text-gray-400 md:hidden" />
            <select
              value={sortOrder}
              onChange={(e) => onSortOrderChange(e.target.value as SortOrder)}
              className="dark:bg-white/5 bg-white dark:border dark:border-white/10 border border-gray-200 dark:text-white text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none dark:focus:border-white/30 focus:border-gray-400 transition-colors cursor-pointer"
            >
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguas</option>
              <option value="name">Por nombre</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="dark:bg-white/5 dark:hover:bg-white/10 bg-gray-100 hover:bg-gray-200 dark:text-white/70 text-gray-600 px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>

        {/* Results Counter */}
        {(hasActiveFilters || filteredCount !== totalPhotos) && (
          <div className="mt-3 pt-3 border-t dark:border-white/5 border-gray-100">
            <p className="text-sm dark:text-white/50 text-gray-500">
              {filteredCount === 0 ? (
                'No se encontraron fotos'
              ) : filteredCount === totalPhotos ? (
                `${totalPhotos} ${totalPhotos === 1 ? 'foto' : 'fotos'}`
              ) : (
                <>
                  Mostrando <span className="dark:text-white text-gray-900 font-medium">{filteredCount}</span> de {totalPhotos} fotos
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
