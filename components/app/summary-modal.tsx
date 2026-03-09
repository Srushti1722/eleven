'use client';

import React, { useState, useCallback } from 'react';
import type { ReceivedMessage } from '@livekit/components-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';
import { useAuth } from '@/components/auth/AuthContext';

interface SummaryData {
  overview: string;
  key_points: string[];
  action_items: string[];
  topics_discussed: string[];
}

interface SummaryModalProps {
  messages: ReceivedMessage[];
}

export function SummaryModal({ messages }: SummaryModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  // Fallback: summarise the current live session via Gemini if mem0 has no history yet
  const geminiSummary = useCallback(async (): Promise<SummaryData | null> => {
    if (messages.length === 0) return null;
    const formatted = messages.map((m) => ({
      role: m.from?.isLocal ? 'user' : 'assistant',
      content: m.message,
    }));
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: formatted }),
        cache: 'no-store',
      });
      if (!res.ok) return null;
      return res.json() as Promise<SummaryData>;
    } catch {
      return null;
    }
  }, [messages]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    // If there are live session messages, summarise them with Gemini right away.
    // Only hit the backend (mem0 history) when there is no current transcript.
    if (messages.length > 0) {
      const result = await geminiSummary();
      setLoading(false);
      if (result) {
        setSummary(result);
      } else {
        setError('Could not generate summary. Make sure GEMINI_API_KEY is configured in your deployment.');
      }
      return;
    }

    // No live messages — fetch historical mem0 summary from the backend.
    const userId = user?.email ?? 'default_user';
    const base =
      process.env.NEXT_PUBLIC_APP_CONFIG_ENDPOINT?.replace(/\/$/, '') ?? 'http://localhost:8080';

    try {
      const url = `${base}/summary?user_id=${encodeURIComponent(userId)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);

      let res: Response;
      try {
        res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      } finally {
        clearTimeout(timer);
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Server error ${res.status}`);
      } else {
        setSummary(data as SummaryData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('abort')) {
        setError(`Request timed out.\nAgent server URL: ${base}`);
      } else {
        setError(`Could not reach agent server.\nURL: ${base}\nError: ${msg}`);
        console.error('[summary]', err);
      }
    } finally {
      setLoading(false);
    }
  }, [messages, user?.email, geminiSummary]);

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
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="rounded-full font-mono text-xs font-bold tracking-wider uppercase"
      >
        Summary
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div
            className={cn(
              'relative z-10 w-full max-w-lg rounded-2xl',
              'bg-background border border-border shadow-2xl',
              'flex flex-col max-h-[80vh]'
            )}
            onClick={(e) => e.stopPropagation()}
          >
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

            <div className="overflow-y-auto px-6 py-4 space-y-5 text-sm">
              {loading && (
                <p className="text-muted-foreground animate-pulse text-center py-8">
                  Generating summary…
                </p>
              )}

              {error && !loading && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-destructive whitespace-pre-wrap text-xs">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchSummary}>
                    Try again
                  </Button>
                </div>
              )}

              {summary && !loading && (
                <>
                  {summary.overview && (
                    <section>
                      <h3 className="font-semibold mb-1 text-foreground">Overview</h3>
                      <p className="text-muted-foreground leading-relaxed">{summary.overview}</p>
                    </section>
                  )}

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