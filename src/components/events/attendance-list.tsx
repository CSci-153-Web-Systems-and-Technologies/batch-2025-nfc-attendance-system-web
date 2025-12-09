'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/client'
import type { AttendanceWithUser } from '@/types/attendance'
import { User, Users, Smartphone, QrCode, UserPlus, Download, Loader2, WifiOff, AlertCircle, RefreshCw } from 'lucide-react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error'

interface AttendanceListProps {
  eventId: string
  organizationId: string
  userRole?: string
}

export function AttendanceList({ eventId, organizationId, userRole }: AttendanceListProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  
  // Stabilize client reference to prevent subscription issues on re-renders
  const supabase = useMemo(() => createClient(), [])
  
  // Track channel and retry timeout for cleanup
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasAutoRetriedRef = useRef(false)

  // Check if user can export (Admin or Owner only)
  const canExport = userRole && ['Admin', 'Owner'].includes(userRole)

  // Fetch initial attendance records
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/attendance/event/${eventId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch attendance')
        }

        const data = await response.json()
        console.log('Fetched attendance data:', data)
        setAttendanceRecords(data.attendees || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load attendance')
        console.error('Error fetching attendance:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [eventId])

  // Setup realtime subscription function
  const setupRealtimeSubscription = useCallback(() => {
    // Clean up existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Subscribe to INSERT events on event_attendance table
    const channel = supabase
      .channel(`event_attendance:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_attendance',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          console.log('New attendance record:', payload)

          // Fetch the complete attendance record with user details
          const { data: newAttendance, error: fetchError } = await supabase
            .from('event_attendance')
            .select(`
              *,
              is_member,
              user:users!event_attendance_user_id_fkey(
                id,
                name,
                email,
                user_type
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (!fetchError && newAttendance) {
            // Prepend the new record to the list
            setAttendanceRecords((prev) => [
              {
                ...newAttendance,
                user: Array.isArray(newAttendance.user) ? newAttendance.user[0] : newAttendance.user
              } as AttendanceWithUser,
              ...prev
            ])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'event_attendance',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('Attendance record deleted:', payload)
          // Remove the deleted record from the list
          setAttendanceRecords((prev) =>
            prev.filter((record) => record.id !== payload.old.id)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_attendance',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          console.log('Attendance record updated:', payload)

          // Fetch the updated attendance record with user details
          const { data: updatedAttendance, error: fetchError } = await supabase
            .from('event_attendance')
            .select(`
              *,
              is_member,
              user:users!event_attendance_user_id_fkey(
                id,
                name,
                email,
                user_type
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (!fetchError && updatedAttendance) {
            // Update the record in the list
            const normalizedRecord = {
              ...updatedAttendance,
              user: Array.isArray(updatedAttendance.user) ? updatedAttendance.user[0] : updatedAttendance.user
            } as AttendanceWithUser
            
            setAttendanceRecords((prev) =>
              prev.map((record) =>
                record.id === normalizedRecord.id ? normalizedRecord : record
              )
            )
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Realtime subscription status:', status, err)
        
        switch (status) {
          case 'SUBSCRIBED':
            setConnectionStatus('connected')
            hasAutoRetriedRef.current = false // Reset auto-retry flag on successful connection
            break
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            setConnectionStatus('error')
            // Auto-retry once after 5 seconds
            if (!hasAutoRetriedRef.current) {
              hasAutoRetriedRef.current = true
              retryTimeoutRef.current = setTimeout(() => {
                setConnectionStatus('reconnecting')
                setupRealtimeSubscription()
              }, 5000)
            }
            break
          case 'CLOSED':
            setConnectionStatus('disconnected')
            break
        }
      })

    channelRef.current = channel
  }, [eventId, supabase])

  // Retry subscription manually
  const retrySubscription = useCallback(() => {
    // Clear any pending auto-retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    hasAutoRetriedRef.current = false // Allow auto-retry again after manual retry
    setConnectionStatus('reconnecting')
    setupRealtimeSubscription()
  }, [setupRealtimeSubscription])

  // Set up real-time subscription
  useEffect(() => {
    setupRealtimeSubscription()

    // Cleanup subscription on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [setupRealtimeSubscription, supabase])

  // Get scan method icon
  const getScanMethodIcon = (method: string) => {
    switch (method) {
      case 'NFC':
        return <Smartphone className="h-4 w-4" />
      case 'QR':
        return <QrCode className="h-4 w-4" />
      case 'Manual':
        return <UserPlus className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  // Get scan method badge color
  const getScanMethodColor = (method: string) => {
    switch (method) {
      case 'NFC':
        return 'bg-primary text-primary-foreground'
      case 'QR':
        return 'bg-accent text-accent-foreground'
      case 'Manual':
        return 'bg-secondary text-secondary-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Handle Excel export
  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch(`/api/attendance/event/${eventId}/export`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export attendance')
      }

      // Get the blob and create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      link.download = filenameMatch ? filenameMatch[1] : `Attendance_${eventId}.xlsx`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting attendance:', err)
      alert(err instanceof Error ? err.message : 'Failed to export attendance')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading attendance records...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (attendanceRecords.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No attendance records yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Attendance will appear here in real-time as members check in
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Export Button - Only for Admin/Owner */}
      {canExport && (
        <div className="flex justify-end mb-4">
          <Button
            onClick={handleExport}
            disabled={exporting}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
        </div>
      )}

      {attendanceRecords.map((record) => (
        <div
          key={record.id}
          className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-4 flex-1">
            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-avatar flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-white" />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {record.user.name}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {record.user.email}
              </p>
            </div>

            {/* User Type Badge */}
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                {record.user.user_type}
              </span>
              {record.is_member === false && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                  Guest
                </span>
              )}
            </div>

            {/* Scan Method Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getScanMethodColor(
                  record.scan_method
                )}`}
              >
                {getScanMethodIcon(record.scan_method)}
                <span className="hidden sm:inline">{record.scan_method}</span>
              </span>
            </div>

            {/* Timestamp */}
            <div className="hidden md:block text-right">
              <p className="text-sm text-muted-foreground">
                {formatTimestamp(record.marked_at)}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Real-time Connection Status Indicator */}
      <div className="text-center pt-4 border-t border-border">
        {connectionStatus === 'connected' && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-xs text-muted-foreground">
              Live updates enabled • {attendanceRecords.length} record{attendanceRecords.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        
        {connectionStatus === 'reconnecting' && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <Loader2 className="h-3 w-3 text-amber-500 animate-spin" />
            <p className="text-xs text-muted-foreground">
              Reconnecting...
            </p>
          </div>
        )}
        
        {connectionStatus === 'disconnected' && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <WifiOff className="h-3 w-3 text-gray-400" />
            <p className="text-xs text-muted-foreground">
              Offline - updates paused
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={retrySubscription}
              className="h-6 px-2 text-xs gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </div>
        )}
        
        {connectionStatus === 'error' && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <AlertCircle className="h-3 w-3 text-red-500" />
            <p className="text-xs text-destructive">
              Connection error
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={retrySubscription}
              className="h-6 px-2 text-xs gap-1 text-destructive hover:text-destructive"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
