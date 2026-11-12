import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { errorMessage } from './api';

// Loads data when the screen comes into focus (and again whenever `key` changes),
// so lists are fresh after coming back from another screen.
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(load);
  latest.current = load;
  const request = useRef(0);

  const reload = useCallback(async () => {
    const id = ++request.current;
    try {
      const result = await latest.current();
      // Ignore responses that were overtaken by a newer request.
      if (id !== request.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (id !== request.current) return;
      setError(errorMessage(err));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, key]),
  );

  return { data, setData, error, loading, reload };
}
