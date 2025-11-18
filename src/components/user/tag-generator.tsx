'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { TAG_WRITE_COOLDOWN_DAYS } from '@/lib/constants';
import type { CanWriteTagResponse, TagWriteRecord } from '@/types/tag';

interface TagGeneratorProps {
  currentTagId: string | null;
  onTagGenerated: (tagId: string) => void;
}

export function TagGenerator({ currentTagId, onTagGenerated }: TagGeneratorProps) {
  const [canWrite, setCanWrite] = useState<CanWriteTagResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [error, setError] = useState<string>('');
  const [history, setHistory] = useState<TagWriteRecord[]>([]);

  useEffect(() => {
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

  const handleGenerateTag = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/user/tag/generate', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate tag');
      }

      const data = await response.json();
      onTagGenerated(data.tag_id);
      
      // Refresh eligibility and history
      await Promise.all([checkEligibility(), fetchHistory()]);
    } catch (error: any) {
      console.error('Error generating tag:', error);
      setError(error.message || 'Failed to generate tag');
    } finally {
      setIsGenerating(false);
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
          <CardTitle>Tag Generation</CardTitle>
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
        <CardTitle>Tag Generation</CardTitle>
        <CardDescription>
          Generate or regenerate your attendance tag ID
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        {currentTagId ? (
          <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Active Tag
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Your tag is ready to use for attendance
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                No Tag Generated
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Generate a tag to enable attendance check-in
              </p>
            </div>
          </div>
        )}

        {/* Generate Button or Cooldown Message */}
        {canWrite?.can_write ? (
          <Button
            onClick={handleGenerateTag}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 mr-2" />
                {currentTagId ? 'Regenerate Tag' : 'Generate Tag'}
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <Button disabled className="w-full" size="lg">
              <Clock className="h-5 w-5 mr-2" />
              Cooldown Active
            </Button>
            
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cooldown Period</span>
                <span className="text-sm text-muted-foreground">
                  {TAG_WRITE_COOLDOWN_DAYS} days
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Days Remaining</span>
                <span className="text-sm font-semibold text-primary">
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                </span>
              </div>
              {canWrite?.next_available_date && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Available on
                  </span>
                  <span className="text-xs font-medium">
                    {formatDate(canWrite.next_available_date)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Generation Failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Tag Write History */}
        {history.length > 0 && (
          <div className="space-y-2">
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
            • Tags can be regenerated every {TAG_WRITE_COOLDOWN_DAYS} days to prevent abuse
          </p>
          <p>
            • Your old tag will stop working once a new one is generated
          </p>
          <p>
            • You'll need to write the new tag to your NFC tag after regeneration
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
