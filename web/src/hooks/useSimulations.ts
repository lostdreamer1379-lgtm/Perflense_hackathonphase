import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureAuthenticated, supabase } from '../lib/supabase';
import type { ScenarioId, SimulationRow } from '../types/report';

/** Simulation jobs for one analysis, with live updates and a polling safety net. */
export function useSimulations(analysisId: string) {
  const [sims, setSims] = useState<SimulationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const simsRef = useRef<SimulationRow[]>([]);
  simsRef.current = sims;

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('simulations')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: true });
    if (data) setSims(data as SimulationRow[]);
  }, [analysisId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`sims-${analysisId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'simulations', filter: `analysis_id=eq.${analysisId}` },
        () => load(),
      )
      .subscribe();
    const poll = setInterval(() => {
      if (simsRef.current.some((s) => s.status === 'queued' || s.status === 'running')) load();
    }, 4000);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [analysisId, load]);

  const run = useCallback(
    async (scenario: ScenarioId) => {
      setError(null);
      let ownerId: string;
      try {
        ownerId = await ensureAuthenticated();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create a secure session');
        return;
      }
      const { error: err } = await supabase
        .from('simulations')
        .insert({ owner_id: ownerId, analysis_id: analysisId, scenario });
      if (err) {
        setError(err.code === '23505' ? 'That scenario is already running.' : err.message);
        return;
      }
      load();
    },
    [analysisId, load],
  );

  return { sims, run, error };
}
