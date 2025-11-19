'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, CheckCircle2, AlertCircle, Loader2, Smartphone } from 'lucide-react';
import { TAG_WRITE_COOLDOWN_DAYS, NFC_RECORD_TYPE } from '@/lib/constants';
import type { CanWriteTagResponse, TagWriteRecord } from '@/types/tag';

interface TagGeneratorProps {
  currentTagId: string | null;
  onTagGenerated: (tagId: string) => void;
}

export function TagGenerator({ currentTagId, onTagGenerated }: TagGeneratorProps) {
  const [canWrite, setCanWrite] = useState<CanWriteTagResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [error, setError] = useState<string>('');
  const [history, setHistory] = useState<TagWriteRecord[]>([]);
  const [nfcSupported, setNfcSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setNfcSupported('NDEFReader' in window);
    }
    checkEligibility();
    fetchHistory();
  }, [currentTagId]);

  const checkEligibility = async () => {
    setIsCheckingEligibility(true);
    try {
      const response = await fetch('/api/user/tag/can-write');
      if (!response.ok) throw new Error('Failed to check eligibility');
      
      const data: CanWriteTagResponse & { days_remaining?: number } = await response.json();
      setCanWrite(data);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setError('Failed to check tag generation eligibility');
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/user/tag/history?limit=3');
      if (!response.ok) return;
      
      const data = await response.json();
      setHistory(data.writes || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const writeToNfc = async (tagId: string) => {
    if (!nfcSupported) {
      setError('NFC is not supported on this device. Use Android Chrome.');
      return false;
    }

    setIsWriting(true);
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.write({
        records: [
          {
            recordType: NFC_RECORD_TYPE,
            data: tagId,
          },
        ],
      });
      return true;
    } catch (error: any) {
      console.error('NFC write error:', error);
      if (error.name === 'NotAllowedError') {
        setError('NFC permission denied. Please allow NFC access.');
      } else if (error.name === 'NotReadableError') {
        setError('Cannot read NFC tag. Try again.');
      } else {
        setError(error.message || 'Failed to write to NFC tag');
      }
      return false;
    } finally {
      setIsWriting(false);
    }
  };

  const handleGenerateAndWrite = async () => {
    if (!nfcSupported) {
      setError('NFC writing is required to generate a new tag. Please use a supported device (Android Chrome).');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    let pendingId: string | null = null;
    let newTagId: string | null = null;

    try {
      // PHASE 1: Prepare the tag (doesn't commit to database yet)
      const prepareResponse = await fetch('/api/user/tag/prepare', { method: 'POST' });
      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json();
        throw new Error(errorData.error || 'Failed to prepare tag');
      }
      const prepareData = await prepareResponse.json();
      newTagId = prepareData.tag_id;
      pendingId = prepareData.pending_id;

      if (!newTagId || !pendingId) {
        throw new Error('Invalid response from server');
      }

      // PHASE 2: Write to NFC
      setIsWriting(true);
      const writeSuccess = await writeToNfc(newTagId);
      
      if (!writeSuccess) {
        // NFC write failed - the pending tag will expire in 5 minutes
        // No database changes were made, so it's safe
        throw new Error('Failed to write tag to NFC. The tag ID was not saved. Please try again.');
      }

      // PHASE 3: Confirm the write (commits to database)
      const confirmResponse = await fetch('/api/user/tag/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_id: pendingId }),
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.error || 'Failed to confirm tag write');
      }

      // Success! Update UI
      onTagGenerated(newTagId);
      await Promise.all([checkEligibility(), fetchHistory()]);
      
    } catch (error: any) {
      console.error('Error in tag generation flow:', error);
      setError(error.message || 'Failed to generate tag');
    } finally {
      setIsGenerating(false);
      setIsWriting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysRemaining = () => {
    if (!canWrite || !canWrite.next_available_date) return 0;
    
    const now = new Date();
    const nextAvailable = new Date(canWrite.next_available_date);
    const diffTime = nextAvailable.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  if (isCheckingEligibility) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tag Management</CardTitle>
          <CardDescription>
            Checking eligibility...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[120px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const daysRemaining = getDaysRemaining();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tag Management</CardTitle>
        <CardDescription>
          Manage your physical NFC attendance tag
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        {currentTagId ? (
          <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Active Tag Assigned
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Your tag is ready for attendance check-in. You can rotate to a new ID in {daysRemaining} days.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                No Tag Assigned
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Program a new tag to enable attendance check-in
              </p>
            </div>
          </div>
        )}

        {/* Main Actions */}
        <div className="space-y-3">
          {/* 1. Generate & Write New Tag (Only if eligible) */}
          {canWrite?.can_write ? (
            <Button
              onClick={handleGenerateAndWrite}
              disabled={isGenerating || isWriting}
              className="w-full"
              size="lg"
            >
              {isGenerating || isWriting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {isWriting ? 'Tap NFC Tag Now...' : 'Generating...'}
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Program New Tag
                </>
              )}
            </Button>
          ) : (
            // Cooldown Active State
            <Button disabled className="w-full opacity-80" variant="secondary" size="lg">
              <Clock className="h-5 w-5 mr-2" />
              New Tag Available in {daysRemaining} Days
            </Button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Operation Failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Tag Write History */}
        {history.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Recent Generations</p>
            <div className="space-y-2">
              {history.map((record, index) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                >
                  <span className="text-muted-foreground">
                    {index === 0 ? 'Latest' : formatDate(record.written_at)}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {record.tag_id.substring(0, 8)}...
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>
            • You can generate and write a new unique tag ID every {TAG_WRITE_COOLDOWN_DAYS} days.
          </p>
          <p>
            • Each tag write creates a completely new ID for security purposes.
          </p>
          {!currentTagId && (
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              • First-time setup: Generate your first tag to enable attendance check-in.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
