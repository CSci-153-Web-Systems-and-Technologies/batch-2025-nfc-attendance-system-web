'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { NFC_RECORD_TYPE, NFC_SCAN_TIMEOUT_MS } from '@/lib/constants';

interface TagWriterProps {
  tagId: string | null;
}

export function TagWriter({ tagId }: TagWriterProps) {
  const [isWriting, setIsWriting] = useState(false);
  const [writeStatus, setWriteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Check NFC support on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      setIsSupported('NDEFReader' in window);
    }
  });

  const handleWriteToNFC = async () => {
    if (!tagId) {
      setErrorMessage('No tag ID available. Please generate a tag first.');
      setWriteStatus('error');
      return;
    }

    if (!('NDEFReader' in window)) {
      setErrorMessage('NFC is not supported on this device. Use Android Chrome browser.');
      setWriteStatus('error');
      return;
    }

    setIsWriting(true);
    setWriteStatus('idle');
    setErrorMessage('');

    try {
      const ndef = new (window as any).NDEFReader();

      // Write the tag ID to the NFC tag
      await ndef.write({
        records: [
          {
            recordType: NFC_RECORD_TYPE,
            data: tagId,
            lang: 'en',
            encoding: 'utf-8',
          },
        ],
      });

      setWriteStatus('success');
      setTimeout(() => setWriteStatus('idle'), 5000);
    } catch (error: any) {
      console.error('NFC write error:', error);
      
      if (error.name === 'AbortError') {
        setErrorMessage('Write cancelled or timed out');
      } else if (error.name === 'NotAllowedError') {
        setErrorMessage('NFC permission denied. Please allow NFC access.');
      } else if (error.name === 'NotSupportedError') {
        setErrorMessage('NFC is not supported on this device');
      } else if (error.name === 'NotReadableError') {
        setErrorMessage('Cannot read NFC tag. Make sure tag is compatible.');
      } else {
        setErrorMessage(error.message || 'Failed to write to NFC tag');
      }
      
      setWriteStatus('error');
    } finally {
      setIsWriting(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Write to NFC Tag</CardTitle>
          <CardDescription>
            NFC writing is not supported on this device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                NFC Not Available
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                NFC writing is only supported on Android Chrome browser (version 89+).
                iOS devices do not support Web NFC API.
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                <strong>Alternative:</strong> Use the QR code displayed above for attendance check-in.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tagId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Write to NFC Tag</CardTitle>
          <CardDescription>
            Generate a tag first before writing to NFC
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[120px] bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              No tag available to write
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write to NFC Tag</CardTitle>
        <CardDescription>
          Write your tag ID to a physical NFC tag for quick tap check-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Write Button */}
        <Button
          onClick={handleWriteToNFC}
          disabled={isWriting}
          className="w-full"
          size="lg"
        >
          {isWriting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Tap NFC Tag Now...
            </>
          ) : (
            <>
              <Smartphone className="h-5 w-5 mr-2" />
              Write to NFC Tag
            </>
          )}
        </Button>

        {/* Status Messages */}
        {writeStatus === 'success' && (
          <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Tag Written Successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your NFC tag is now ready to use for attendance check-in.
              </p>
            </div>
          </div>
        )}

        {writeStatus === 'error' && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Write Failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-medium">How to write:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Click the "Write to NFC Tag" button above</li>
            <li>Hold your NFC tag close to your phone's back</li>
            <li>Wait for the success message</li>
          </ol>
          <p className="mt-3 text-xs">
            <strong>Recommended tags:</strong> NTAG213, NTAG215, or NTAG216
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
