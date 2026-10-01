import { useEffect, useRef, useState } from 'react';
import { ensureAuthenticated, supabase } from '../lib/supabase';
import type { AnalysisRow } from '../types/report';

/** Creates a queued analysis job and returns its id. */
export async function submitUrl(rawUrl: string): Promise<string> {
  const ownerId = await ensureAuthenticated();
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const { data, error } = await supabase.from('analyses').insert({ owner_id: ownerId, url }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'Could not start the analysis');
  return data.id as string;
}

/** Loads one analysis and keeps it fresh: live updates, with polling as a safety net. */
export function useAnalysis(id: string | null) {
  const [row, setRow] = useState<AnalysisRow | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const statusRef = useRef<string | null>(null);

  useEffect(() => {
    statusRef.current = row?.status ?? null;
  }, [row?.status]);

  useEffect(() => {
    if (!id) {
      setRow(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);

    const load = async () => {
      const { data } = await supabase.from('analyses').select('*').eq('id', id).maybeSingle();
      if (!alive) return;
      setRow((data as AnalysisRow | null) ?? null);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`analysis-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'analyses', filter: `id=eq.${id}` },
        (payload) => alive && setRow(payload.new as AnalysisRow),
      )
      .subscribe();

    const poll = setInterval(() => {
      if (statusRef.current === 'done' || statusRef.current === 'error') return;
      load();
    }, 4000);

    return () => {
      alive = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [id]);

  return { row, loading };
}
