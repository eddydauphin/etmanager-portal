import { useEffect, useState } from 'react';

/**
 * Modules "en pause" (feature flags).
 *
 * La plateforme se recentre sur la formation et le coaching : les modules
 * listés ici restent dans le code et dans la base, mais sont masqués du menu
 * et de leurs routes tant qu'un super admin ne les réactive pas depuis
 * Paramètres → Modules. Le réglage est stocké dans ce navigateur.
 */
const STORAGE_KEY = 'etm_features';

const DEFAULTS = {
  sops: false,
  reports: false
};

export const PARKED_MODULES = [
  { key: 'sops', label: 'Procédures (SOP)', description: 'Rédaction, validation et exécution de modes opératoires.' },
  { key: 'reports', label: 'Rapports', description: 'Analyses et exports transverses.' }
];

export function getFeatures() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULTS, ...stored };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setFeature(key, enabled) {
  const next = { ...getFeatures(), [key]: !!enabled };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // stockage indisponible : le réglage vaut pour la session en cours
  }
  window.dispatchEvent(new Event('etm:features'));
  return next;
}

/** Un module inconnu est considéré actif : seuls les modules en pause sont masqués. */
export function isFeatureEnabled(key) {
  return getFeatures()[key] !== false;
}

export function useFeatures() {
  const [features, setFeatures] = useState(getFeatures);
  useEffect(() => {
    const refresh = () => setFeatures(getFeatures());
    window.addEventListener('etm:features', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('etm:features', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return features;
}
