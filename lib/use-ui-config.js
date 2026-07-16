import { useEffect, useState } from 'react';

const safeDefault = { environment: 'unknown', readOnly: true, role: 'viewer', user: 'unknown', tenantDelimiter: '|' };

export function useUiConfig() {
  const [config, setConfig] = useState(safeDefault);
  useEffect(() => {
    let active = true;
    fetch('/api/config', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Configuration unavailable')))
      .then((value) => active && setConfig(value))
      .catch(() => active && setConfig(safeDefault));
    return () => { active = false; };
  }, []);
  return config;
}
