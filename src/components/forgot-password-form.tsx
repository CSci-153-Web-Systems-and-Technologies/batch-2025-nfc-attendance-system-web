'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/client'
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
import Link from 'next/link'
import { useState } from 'react'

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [oauthInfo, setOauthInfo] = useState<{
    provider: string
    hasPassword: boolean
  } | null>(null)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    setOauthInfo(null)

    try {
      // First, check if user exists and their auth provider
      const checkResponse = await fetch('/api/user/check-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const checkData = await checkResponse.json()

      if (!checkResponse.ok) {
        throw new Error(checkData.error || 'Failed to check account')
      }

      // If user can't reset password (OAuth without password)
      if (!checkData.canReset) {
        setOauthInfo({
          provider: checkData.authProvider || 'OAuth',
          hasPassword: checkData.hasPassword || false,
        })
        setSuccess(false)
        setIsLoading(false)
        return
      }

      // User can reset password - send reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>Password reset instructions sent</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              We've sent you a password reset link. Please check your email and follow the
              instructions to reset your password.
            </p>
            <div className="text-center">
              <Link href="/login" className="text-sm underline underline-offset-4">
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : oauthInfo ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Set a Password</CardTitle>
            <CardDescription>This account uses {oauthInfo.provider} login</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your account was created using <strong>{oauthInfo.provider}</strong> authentication
                and doesn't have a password set yet.
              </p>
              <p className="text-sm text-muted-foreground">
                You can still log in using your {oauthInfo.provider} account, or you can set a
                password to enable email/password login.
              </p>
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  💡 To set a password:
                </p>
                <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                  <li>Continue with the password reset process</li>
                  <li>Check your email for the reset link</li>
                  <li>Set your new password</li>
                  <li>You can now login with either {oauthInfo.provider} or email/password!</li>
                </ol>
              </div>
              <Button
                onClick={async () => {
                  setOauthInfo(null)
                  setIsLoading(true)
                  try {
                    const supabase = createClient()
                    await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/update-password`,
                    })
                    setSuccess(true)
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'An error occurred')
                  } finally {
                    setIsLoading(false)
                  }
                }}
                className="w-full"
                disabled={isLoading}
              >
                Send Password Setup Email
              </Button>
              <div className="text-center space-x-4">
                <Link href="/login" className="text-sm underline underline-offset-4">
                  Back to Login
                </Link>
                <button
                  onClick={() => {
                    setOauthInfo(null)
                    setEmail('')
                  }}
                  className="text-sm underline underline-offset-4"
                >
                  Try Different Email
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Reset Your Password</CardTitle>
            <CardDescription>
              Type in your email and we&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Checking...' : 'Send reset email'}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <Link href="/login" className="underline underline-offset-4">
                  Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
