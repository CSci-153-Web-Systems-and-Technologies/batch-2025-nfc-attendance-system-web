'use client';

import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check } from 'lucide-react';
import { QR_CODE_SIZE, QR_CODE_ERROR_CORRECTION } from '@/lib/constants';

interface TagDisplayCardProps {
  tagId: string;
  userName: string;
}

export function TagDisplayCard({ tagId, userName }: TagDisplayCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (tagId) {
      generateQRCode();
    }
  }, [tagId]);

  const generateQRCode = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(tagId, {
        width: QR_CODE_SIZE,
        errorCorrectionLevel: QR_CODE_ERROR_CORRECTION,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(dataUrl);

      // Also draw to canvas for download
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, tagId, {
          width: QR_CODE_SIZE,
          errorCorrectionLevel: QR_CODE_ERROR_CORRECTION,
          margin: 2,
        });
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${userName.replace(/\s+/g, '_')}_qr_code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleCopyTagId = async () => {
    try {
      await navigator.clipboard.writeText(tagId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!tagId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your QR Code</CardTitle>
          <CardDescription>
            Generate a tag to display your QR code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
            <p className="text-muted-foreground">No tag generated yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your QR Code</CardTitle>
        <CardDescription>
          Scan this code to mark your attendance at events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code Display */}
        <div className="flex flex-col items-center gap-4">
          {qrDataUrl && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <img
                src={qrDataUrl}
                alt="Your QR Code"
                className="w-[300px] h-[300px]"
              />
            </div>
          )}

          {/* Hidden canvas for download */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleDownloadPNG} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </Button>
            <Button
              onClick={handleCopyTagId}
              variant="outline"
              size="sm"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Tag ID
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tag ID Display */}
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground mb-1">Tag ID</p>
          <p className="text-sm font-mono break-all">{tagId}</p>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Use this QR code for quick attendance check-in</p>
          <p>• Works on all devices with camera</p>
          <p>• Download and print for easy access</p>
        </div>
      </CardContent>
    </Card>
  );
}
