'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserType } from '@/types/user'

export function CompleteProfileForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [name, setName] = useState('')
  const [userType, setUserType] = useState<UserType>('Student')
  const [nfcTagId, setNfcTagId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          user_type: userType,
          nfc_tag_id: nfcTagId.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete profile')
      }

      // Redirect to dashboard on success
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
        <CardDescription>
          Please provide your details to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-type">User Type</Label>
              <select
                id="user-type"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                value={userType}
                onChange={(e) => setUserType(e.target.value as UserType)}
                disabled={isLoading}
                required
              >
                <option value="Student">Student</option>
                <option value="Faculty">Faculty</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nfc-tag">NFC Tag ID (Optional)</Label>
              <Input
                id="nfc-tag"
                type="text"
                placeholder="Enter your NFC tag ID"
                value={nfcTagId}
                onChange={(e) => setNfcTagId(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                You can add this later if you don&apos;t have it now
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Profile...' : 'Complete Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
