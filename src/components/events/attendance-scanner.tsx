'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Smartphone,
  QrCode,
  UserPlus,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { Html5Qrcode } from 'html5-qrcode'
import type { ScanMethod } from '@/lib/constants'

interface AttendanceScannerProps {
  eventId: string
  organizationId: string
  eventName: string
  organizationName: string
}

interface ScannedUser {
  id: string
  name: string
  email: string
  user_type: string
  tag_id: string
  marked_at: string
  scan_method: ScanMethod
  status: 'success' | 'error' | 'duplicate'
  message?: string
}

type ScanMode = 'NFC' | 'QR' | 'Manual'

export function AttendanceScanner({
  eventId,
  organizationId,
  eventName,
  organizationName,
}: AttendanceScannerProps) {
  const [scanMode, setScanMode] = useState<ScanMode>('QR')
  const [isScanning, setIsScanning] = useState(false)
  const [scannedUsers, setScannedUsers] = useState<ScannedUser[]>([])
  const [manualTagId, setManualTagId] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [nfcSupported, setNfcSupported] = useState(false)
  const qrReaderRef = useRef<Html5Qrcode | null>(null)
  const qrScannerRef = useRef<HTMLDivElement>(null)

  // Check NFC support on mount
  useEffect(() => {
    setNfcSupported('NDEFReader' in window)
  }, [])

  // Cleanup QR scanner on unmount or mode change
  useEffect(() => {
    return () => {
      if (qrReaderRef.current) {
        qrReaderRef.current.stop().catch(() => {})
        qrReaderRef.current = null
      }
    }
  }, [scanMode])

  // Start NFC scanning
  const startNFCScan = async () => {
    if (!nfcSupported) {
      alert('NFC is not supported on this device or browser. Please use Android Chrome.')
      return
    }

    try {
      setIsScanning(true)
      const ndef = new (window as any).NDEFReader()

      await ndef.scan()
      console.log('NFC scan started')

      ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
        console.log('NFC tag detected:', serialNumber)

        // Extract tag ID from NDEF records
        let tagId = null
        for (const record of message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder()
            tagId = textDecoder.decode(record.data)
            break
          }
        }

        if (tagId) {
          processTag(tagId, 'NFC')
        }
      })
    } catch (error: any) {
      console.error('NFC scan error:', error)
      if (error.name === 'NotAllowedError') {
        alert('NFC permission denied. Please allow NFC access.')
      } else if (error.name === 'NotSupportedError') {
        alert('NFC is not supported on this device.')
      } else {
        alert(`NFC error: ${error.message}`)
      }
      setIsScanning(false)
    }
  }

  // Stop NFC scanning
  const stopNFCScan = () => {
    setIsScanning(false)
    // Note: NDEFReader doesn't have a stop method, we just stop processing
  }

  // Start QR scanning
  const startQRScan = async () => {
    if (!qrScannerRef.current) return

    try {
      setIsScanning(true)

      const qrReader = new Html5Qrcode('qr-reader')
      qrReaderRef.current = qrReader

      await qrReader.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log('QR code detected:', decodedText)
          processTag(decodedText, 'QR')
        },
        (errorMessage) => {
          // Ignore continuous scanning errors
        }
      )
    } catch (error: any) {
      console.error('QR scan error:', error)
      alert(`Failed to start QR scanner: ${error.message}`)
      setIsScanning(false)
    }
  }

  // Stop QR scanning
  const stopQRScan = async () => {
    if (qrReaderRef.current) {
      try {
        await qrReaderRef.current.stop()
        qrReaderRef.current = null
      } catch (error) {
        console.error('Error stopping QR scanner:', error)
      }
    }
    setIsScanning(false)
  }

  // Process scanned tag (NFC or QR)
  const processTag = async (tagId: string, method: ScanMethod) => {
    if (isProcessing) return // Prevent duplicate processing

    setIsProcessing(true)

    try {
      // Look up user by tag
      const userResponse = await fetch(`/api/user/by-tag?tag_id=${encodeURIComponent(tagId)}`)

      if (!userResponse.ok) {
        addScannedUser({
          id: '',
          name: 'Unknown',
          email: '',
          user_type: '',
          tag_id: tagId,
          marked_at: new Date().toISOString(),
          scan_method: method,
          status: 'error',
          message: 'User not found with this tag',
        })
        setIsProcessing(false)
        return
      }

      const userData = await userResponse.json()
      const user = userData.user

      // Mark attendance
      const attendanceResponse = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          user_id: user.id,
          scan_method: method,
          location_lat: null,
          location_lng: null,
        }),
      })

      const attendanceData = await attendanceResponse.json()

      if (!attendanceResponse.ok) {
        const isDuplicate = attendanceData.error?.includes('already marked')
        addScannedUser({
          id: user.id,
          name: user.name,
          email: user.email,
          user_type: user.user_type,
          tag_id: tagId,
          marked_at: new Date().toISOString(),
          scan_method: method,
          status: isDuplicate ? 'duplicate' : 'error',
          message: attendanceData.error || 'Failed to mark attendance',
        })
      } else {
        addScannedUser({
          id: user.id,
          name: user.name,
          email: user.email,
          user_type: user.user_type,
          tag_id: tagId,
          marked_at: attendanceData.attendance.marked_at,
          scan_method: method,
          status: 'success',
          message: 'Attendance marked successfully',
        })
      }
    } catch (error: any) {
      console.error('Error processing tag:', error)
      addScannedUser({
        id: '',
        name: 'Error',
        email: '',
        user_type: '',
        tag_id: tagId,
        marked_at: new Date().toISOString(),
        scan_method: method,
        status: 'error',
        message: error.message || 'Failed to process tag',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Manual entry
  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTagId.trim() || isProcessing) return

    await processTag(manualTagId.trim(), 'Manual')
    setManualTagId('')
  }

  // Add scanned user to the list
  const addScannedUser = (user: ScannedUser) => {
    setScannedUsers((prev) => [user, ...prev])

    // Play success/error sound (optional)
    if (user.status === 'success') {
      playSound('success')
    } else if (user.status === 'duplicate') {
      playSound('warning')
    } else {
      playSound('error')
    }
  }

  // Play sound feedback
  const playSound = (type: 'success' | 'error' | 'warning') => {
    const audio = new Audio()
    // You can add actual sound files here
    // audio.src = `/sounds/${type}.mp3`
    // audio.play().catch(() => {})
  }

  // Get status icon
  const getStatusIcon = (status: 'success' | 'error' | 'duplicate') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'duplicate':
        return <CheckCircle2 className="h-5 w-5 text-amber-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  // Get status color
  const getStatusColor = (status: 'success' | 'error' | 'duplicate') => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'duplicate':
        return 'bg-amber-50 border-amber-200'
      case 'error':
        return 'bg-red-50 border-red-200'
    }
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/organizations/${organizationId}/events/${eventId}`}
            className="text-primary hover:underline mb-2 inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Take Attendance
          </h1>
          <p className="text-gray-600 mt-1">
            {eventName} • {organizationName}
          </p>
        </div>
      </div>

      {/* Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Scan Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant={scanMode === 'NFC' ? 'default' : 'outline'}
              className="h-20 flex-col gap-2"
              onClick={() => {
                if (isScanning) {
                  if (scanMode === 'QR') stopQRScan()
                  if (scanMode === 'NFC') stopNFCScan()
                }
                setScanMode('NFC')
              }}
              disabled={!nfcSupported}
            >
              <Smartphone className="h-6 w-6" />
              <span>NFC</span>
            </Button>

            <Button
              variant={scanMode === 'QR' ? 'default' : 'outline'}
              className="h-20 flex-col gap-2"
              onClick={() => {
                if (isScanning) {
                  if (scanMode === 'QR') stopQRScan()
                  if (scanMode === 'NFC') stopNFCScan()
                }
                setScanMode('QR')
              }}
            >
              <QrCode className="h-6 w-6" />
              <span>QR Code</span>
            </Button>

            <Button
              variant={scanMode === 'Manual' ? 'default' : 'outline'}
              className="h-20 flex-col gap-2"
              onClick={() => {
                if (isScanning) {
                  if (scanMode === 'QR') stopQRScan()
                  if (scanMode === 'NFC') stopNFCScan()
                }
                setScanMode('Manual')
              }}
            >
              <UserPlus className="h-6 w-6" />
              <span>Manual</span>
            </Button>
          </div>

          {!nfcSupported && (
            <p className="text-sm text-amber-600 mt-4 text-center">
              NFC is only supported on Android Chrome browser
            </p>
          )}
        </CardContent>
      </Card>

      {/* Scanner Interface */}
      <Card>
        <CardHeader>
          <CardTitle>
            {scanMode === 'NFC' && 'NFC Scanner'}
            {scanMode === 'QR' && 'QR Code Scanner'}
            {scanMode === 'Manual' && 'Manual Entry'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* NFC Mode */}
          {scanMode === 'NFC' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {!isScanning ? (
                  <Button
                    onClick={startNFCScan}
                    size="lg"
                    className="gap-2"
                  >
                    <Smartphone className="h-5 w-5" />
                    Start NFC Scan
                  </Button>
                ) : (
                  <Button
                    onClick={stopNFCScan}
                    size="lg"
                    variant="destructive"
                    className="gap-2"
                  >
                    <XCircle className="h-5 w-5" />
                    Stop Scanning
                  </Button>
                )}
              </div>

              {isScanning && (
                <div className="text-center py-8">
                  <div className="w-24 h-24 mx-auto mb-4 relative">
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-4 bg-primary/10 rounded-full flex items-center justify-center">
                      <Smartphone className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    Ready to scan NFC tag
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Hold the NFC tag near your device
                  </p>
                </div>
              )}
            </div>
          )}

          {/* QR Mode */}
          {scanMode === 'QR' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {!isScanning ? (
                  <Button
                    onClick={startQRScan}
                    size="lg"
                    className="gap-2"
                  >
                    <QrCode className="h-5 w-5" />
                    Start QR Scan
                  </Button>
                ) : (
                  <Button
                    onClick={stopQRScan}
                    size="lg"
                    variant="destructive"
                    className="gap-2"
                  >
                    <XCircle className="h-5 w-5" />
                    Stop Scanning
                  </Button>
                )}
              </div>

              {isScanning && (
                <div
                  id="qr-reader"
                  ref={qrScannerRef}
                  className="w-full max-w-md mx-auto rounded-lg overflow-hidden"
                ></div>
              )}
            </div>
          )}

          {/* Manual Mode */}
          {scanMode === 'Manual' && (
            <form onSubmit={handleManualEntry} className="space-y-4">
              <div>
                <Label htmlFor="tag-id">Tag ID</Label>
                <Input
                  id="tag-id"
                  type="text"
                  placeholder="Enter or paste tag ID"
                  value={manualTagId}
                  onChange={(e) => setManualTagId(e.target.value)}
                  disabled={isProcessing}
                  className="mt-2"
                />
              </div>
              <Button
                type="submit"
                disabled={!manualTagId.trim() || isProcessing}
                className="w-full gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Mark Attendance
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Scanned Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Scanned Records</CardTitle>
            <span className="text-sm text-muted-foreground">
              {scannedUsers.length} scan{scannedUsers.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {scannedUsers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No scans yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start scanning to mark attendance
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scannedUsers.map((user, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(user.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(user.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {user.name}
                        </p>
                        {user.email && (
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                        )}
                        {user.message && (
                          <p
                            className={`text-sm mt-1 ${
                              user.status === 'success'
                                ? 'text-green-700'
                                : user.status === 'duplicate'
                                ? 'text-amber-700'
                                : 'text-red-700'
                            }`}
                          >
                            {user.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {user.scan_method}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(user.marked_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
