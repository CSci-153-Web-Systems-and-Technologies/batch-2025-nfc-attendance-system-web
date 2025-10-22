import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import type { User } from '@/types/user'

interface UseUserProfileReturn {
  user: User | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useUserProfile(): UseUserProfileReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/user/profile')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile')
      }

      setUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  return { user, loading, error, refetch: fetchProfile }
}

interface UseProfileStatusReturn {
  hasProfile: boolean
  loading: boolean
  error: string | null
  authId: string | null
  email: string | null
}

export function useProfileStatus(): UseProfileStatusReturn {
  const [hasProfile, setHasProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authId, setAuthId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const checkProfileStatus = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/user/profile-status')
        const data = await response.json()

        if (response.ok) {
          setHasProfile(data.hasProfile)
          setAuthId(data.authId || null)
          setEmail(data.email || null)
        } else {
          setError(data.error || 'Failed to check profile status')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    checkProfileStatus()
  }, [])

  return { hasProfile, loading, error, authId, email }
}
