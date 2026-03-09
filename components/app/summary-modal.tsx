'use client';

import React, { useState, useCallback } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

interface SummaryData {
  overview: string;
  key_points: string[];
  action_items: string[];
  topics_discussed: string[];
}

export function SummaryModal() {
  const room = useRoomContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const roomName = room?.name ?? '';
      const res = await fetch(`/api/summary?room=${encodeURIComponent(roomName)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to fetch summary');
      } else {
        setSummary(data as SummaryData);
      }
    } catch {
      setError('Could not reach server');
    } finally {
      setLoading(false);
    }
  }, [room]);

  const handleOpen = () => {
    setOpen(true);
    fetchSummary();
  };

  const handleClose = () => {
    setOpen(false);
    setError(null);
  };

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="rounded-full font-mono text-xs font-bold tracking-wider uppercase"
      >
        Summary
      </Button>

      {/* Backdrop + Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className={cn(
              'relative z-10 w-full max-w-lg rounded-2xl',
              'bg-background border border-border shadow-2xl',
              'flex flex-col max-h-[80vh]'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Conversation Summary</h2>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-4 space-y-5 text-sm">
              {loading && (
                <p className="text-muted-foreground animate-pulse text-center py-8">
                  Generating summary…
                </p>
              )}

              {error && (
                <p className="text-destructive text-center py-8">{error}</p>
              )}

              {summary && !loading && (
                <>
                  {/* Overview */}
                  {summary.overview && (
                    <section>
                      <h3 className="font-semibold mb-1 text-foreground">Overview</h3>
                      <p className="text-muted-foreground leading-relaxed">{summary.overview}</p>
                    </section>
                  )}

                  {/* Key Points */}
                  {summary.key_points?.length > 0 && (
                    <section>
                      <h3 className="font-semibold mb-1 text-foreground">Key Points</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {summary.key_points.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Action Items */}
                  {summary.action_items?.length > 0 && (
                    <section>
                      <h3 className="font-semibold mb-1 text-foreground">Action Items</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {summary.action_items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Topics Discussed */}
                  {summary.topics_discussed?.length > 0 && (
                    <section>
                      <h3 className="font-semibold mb-1 text-foreground">Topics Discussed</h3>
                      <div className="flex flex-wrap gap-2">
                        {summary.topics_discussed.map((topic, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={fetchSummary} disabled={loading}>
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
