import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Star, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { stocksApi } from '@/api/stocks.api'
import { useAddFavorite } from '@/hooks/useFavorites'
import { useFavoritesStore } from '@/stores/useFavoritesStore'

interface SearchResult {
  ticker: string
  name: string
  exchange?: string
  type?: string
}

interface StockSearchInputProps {
  onSelect?: (ticker: string, name?: string) => void
  placeholder?: string
  className?: string
  showFavoriteButton?: boolean
  autoFocus?: boolean
}

export function StockSearchInput({
  onSelect,
  placeholder = '종목 검색 (예: AAPL, MSFT)',
  className,
  showFavoriteButton = false,
  autoFocus = false,
}: StockSearchInputProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const favorites = useFavoritesStore((s) => s.favorites)
  const addFavoriteMutation = useAddFavorite()

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Search API call
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['stock-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 1) return []
      const results = await stocksApi.search(debouncedQuery)
      return results as SearchResult[]
    },
    enabled: debouncedQuery.length >= 1,
    staleTime: 30_000,
  })

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (query.trim() && onSelect) {
        onSelect(query.trim().toUpperCase())
        setQuery('')
        setShowDropdown(false)
      }
    },
    [query, onSelect]
  )

  const handleSelectResult = (result: SearchResult) => {
    if (onSelect) {
      onSelect(result.ticker, result.name)
    }
    setQuery('')
    setShowDropdown(false)
  }

  const handleAddFavorite = async (result: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation()
    await addFavoriteMutation.mutateAsync({
      ticker: result.ticker,
      name: result.name,
      market: result.exchange || 'US',
    })
  }

  const handleClear = () => {
    setQuery('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const isFavorite = (ticker: string) => favorites.some((f) => f.ticker === ticker)

  return (
    <div className={cn('relative', className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search
            className={cn(
              'absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 transition-colors',
              isFocused ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => {
              setIsFocused(true)
              if (query.length > 0) setShowDropdown(true)
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="toss-input pl-11 pr-10 w-full"
            autoFocus={autoFocus}
          />
          {isLoading && query.length > 0 && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown Results */}
      <AnimatePresence>
        {showDropdown && (searchResults.length > 0 || isLoading) && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-background shadow-toss-lg overflow-hidden"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-body-2 text-muted-foreground">검색 중...</span>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.ticker}
                    onClick={() => handleSelectResult(result)}
                    className="group flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-secondary"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-caption font-bold text-foreground">
                        {result.ticker.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-2 font-medium text-foreground truncate">{result.ticker}</p>
                        <p className="text-caption text-muted-foreground truncate">{result.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {result.exchange && (
                        <span className="text-caption text-muted-foreground">{result.exchange}</span>
                      )}
                      {showFavoriteButton && (
                        <button
                          onClick={(e) => handleAddFavorite(result, e)}
                          disabled={isFavorite(result.ticker) || addFavoriteMutation.isPending}
                          className={cn(
                            'p-1.5 rounded-lg transition-all',
                            isFavorite(result.ticker)
                              ? 'text-yellow-500 cursor-default'
                              : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10'
                          )}
                          title={isFavorite(result.ticker) ? '이미 관심종목입니다' : '관심종목 추가'}
                        >
                          <Star
                            className="h-4 w-4"
                            fill={isFavorite(result.ticker) ? 'currentColor' : 'none'}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      <AnimatePresence>
        {showDropdown && !isLoading && debouncedQuery.length >= 1 && searchResults.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-background shadow-toss-lg p-4"
          >
            <p className="text-center text-body-2 text-muted-foreground">
              "{debouncedQuery}"에 대한 검색 결과가 없습니다
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
