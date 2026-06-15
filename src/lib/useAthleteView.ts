import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

export function useAthleteView(athleteId: number | undefined) {
  const tracked = useRef(false);
  useEffect(() => {
    if (!athleteId || tracked.current) return;
    tracked.current = true;
    supabase.from('athlete_views').insert({ athlete_id: athleteId }).then(() => {}, () => {});
  }, [athleteId]);
}
