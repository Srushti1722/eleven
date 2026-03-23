'use client';

import React, { useCallback, useState } from 'react';
import type { ReceivedMessage } from '@livekit/components-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

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
        setError(
          'Could not generate summary. Make sure GOOGLE_API_KEY is configured in your deployment.'
        );
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
              'bg-background border-border border shadow-2xl',
              'flex max-h-[80vh] flex-col'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-border flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Conversation Summary</h2>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground text-lg leading-none transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto px-6 py-4 text-sm">
              {loading && (
                <p className="text-muted-foreground animate-pulse py-8 text-center">
                  Generating summary…
                </p>
              )}

              {error && !loading && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-destructive text-xs whitespace-pre-wrap">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchSummary}>
                    Try again
                  </Button>
                </div>
              )}

              {summary && !loading && (
                <>
                  {summary.overview && (
                    <section>
                      <h3 className="text-foreground mb-1 font-semibold">Overview</h3>
                      <p className="text-muted-foreground leading-relaxed">{summary.overview}</p>
                    </section>
                  )}

                  {summary.key_points?.length > 0 && (
                    <section>
                      <h3 className="text-foreground mb-1 font-semibold">Key Points</h3>
                      <ul className="text-muted-foreground list-inside list-disc space-y-1">
                        {summary.key_points.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {summary.action_items?.length > 0 && (
                    <section>
                      <h3 className="text-foreground mb-1 font-semibold">Action Items</h3>
                      <ul className="text-muted-foreground list-inside list-disc space-y-1">
                        {summary.action_items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {summary.topics_discussed?.length > 0 && (
                    <section>
                      <h3 className="text-foreground mb-1 font-semibold">Topics Discussed</h3>
                      <div className="flex flex-wrap gap-2">
                        {summary.topics_discussed.map((topic, i) => (
                          <span
                            key={i}
                            className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium"
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

            <div className="border-border flex justify-end gap-2 border-t px-6 py-3">
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
