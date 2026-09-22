import { useEffect, useState } from 'react';
import { api, Taxonomy } from '../../utils/api';

let _cache: Taxonomy | null = null;
let _inflight: Promise<Taxonomy> | null = null;

export async function loadTaxonomy(): Promise<Taxonomy> {
  if (_cache) return _cache;
  if (!_inflight) {
    _inflight = api.getTaxonomy().then((t) => { _cache = t; return t; });
  }
  return _inflight;
}

export function useTaxonomy() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(_cache);
  useEffect(() => {
    let mounted = true;
    if (!_cache) {
      loadTaxonomy().then((t) => { if (mounted) setTaxonomy(t); }).catch(() => {});
    }
    return () => { mounted = false; };
  }, []);
  return taxonomy;
}

export function categoryEmojiMap(taxonomy: Taxonomy | null): Record<string, string> {
  const map: Record<string, string> = {};
  taxonomy?.categories.forEach((c) => { map[c.name] = c.emoji; });
  return map;
}
