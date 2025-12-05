'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface PaginationInfo {
  total: number
  offset: number
  limit: number
  has_more: boolean
}

export interface UseInfiniteScrollOptions<T, F = Record<string, unknown>> {
  /** Function to fetch data - receives offset, limit, and current filters */
  fetchFn: (offset: number, limit: number, filters: F) => Promise<{ data: T[]; pagination: PaginationInfo }>
  /** Number of items per page (default: 10) */
  pageSize?: number
  /** Initial data to start with */
  initialData?: T[]
  /** Initial total count */
  initialTotal?: number
  /** Filter object - when this changes, pagination resets */
  filters?: F
  /** Whether to fetch on mount (default: true) */
  fetchOnMount?: boolean
}

export interface UseInfiniteScrollReturn<T> {
  /** Current data array */
  data: T[]
  /** Whether initial data is loading */
  isLoading: boolean
  /** Whether more data is being loaded */
  isLoadingMore: boolean
  /** Ref to attach to the sentinel element for intersection observer */
  loadMoreRef: React.RefObject<HTMLDivElement>
  /** Whether there's more data to load */
  hasMore: boolean
  /** Total count of items */
  total: number
  /** Reset and refetch data */
  refresh: () => Promise<void>
  /** Manually set data (for optimistic updates) */
  setData: React.Dispatch<React.SetStateAction<T[]>>
  /** Current error if any */
  error: string | null
}

export function useInfiniteScroll<T, F = Record<string, unknown>>({
  fetchFn,
  pageSize = 10,
  initialData = [],
  initialTotal = 0,
  filters = {} as F,
  fetchOnMount = true,
}: UseInfiniteScrollOptions<T, F>): UseInfiniteScrollReturn<T> {
  const [data, setData] = useState<T[]>(initialData)
  const [offset, setOffset] = useState(initialData.length)
  const [total, setTotal] = useState(initialTotal)
  const [isLoading, setIsLoading] = useState(fetchOnMount && initialData.length === 0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)
  const filtersRef = useRef(filters)

  const hasMore = data.length < total

  // Fetch more data
  const fetchMore = useCallback(async (reset: boolean = false) => {
    try {
      const effectiveOffset = reset ? 0 : offset
      const result = await fetchFn(effectiveOffset, pageSize, filtersRef.current)
      
      if (reset) {
        setData(result.data)
        setOffset(result.data.length)
      } else {
        setData(prev => [...prev, ...result.data])
        setOffset(prev => prev + result.data.length)
      }
      
      setTotal(result.pagination.total)
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    }
  }, [fetchFn, offset, pageSize])

  // Refresh function to reset and refetch
  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchMore(true)
    setIsLoading(false)
  }, [fetchMore])

  // Initial fetch on mount
  useEffect(() => {
    if (fetchOnMount && initialData.length === 0) {
      fetchMore(true).finally(() => setIsLoading(false))
    }
  }, []) // Only run on mount

  // Reset when filters change (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      filtersRef.current = filters
      return
    }

    // Check if filters actually changed
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(filtersRef.current)
    if (filtersChanged) {
      filtersRef.current = filters
      setIsLoading(true)
      setData([])
      setOffset(0)
      fetchMore(true).finally(() => setIsLoading(false))
    }
  }, [JSON.stringify(filters)])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && !isLoading && !isLoadingMore && hasMore) {
          setIsLoadingMore(true)
          fetchMore(false).finally(() => setIsLoadingMore(false))
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(element)
    return () => observer.unobserve(element)
  }, [hasMore, isLoading, isLoadingMore, fetchMore])

  return {
    data,
    isLoading,
    isLoadingMore,
    loadMoreRef: loadMoreRef as React.RefObject<HTMLDivElement>,
    hasMore,
    total,
    refresh,
    setData,
    error,
  }
}
