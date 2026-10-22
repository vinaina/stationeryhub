import { useCallback, useEffect, useState } from 'react';

// Load data and optionally poll it. Returns [data, reload, error].
export function useLoad(loader, intervalMs) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try { setData(await loader()); setError(''); }
    catch (e) { setError(e.message); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    reload();
    if (!intervalMs) return undefined;
    const t = setInterval(reload, intervalMs);
    return () => clearInterval(t);
  }, [reload, intervalMs]);
  return [data, reload, error];
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, kind = 'ok') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }, []);
  return [toast, show];
}
