import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { hasCapability } from '../components/shared/Layout';
import TrainingModulesPage from './TrainingModulesPage';
import DevelopmentCenterPage from './DevelopmentCenterPage';

/**
 * Formations : un seul point d'entrée pour les supports de formation et
 * pour l'assignation d'une compétence ou d'un coaching (ex-Coaching).
 * Onglet choisi par ?onglet=supports | coaching.
 */
const TABS = [
  { key: 'supports', label: 'Supports de formation', capability: 'training' },
  { key: 'coaching', label: 'Assigner une compétence ou un coaching', capability: 'development_center' }
];

export default function TrainingHubPage() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();

  const available = TABS.filter(t => hasCapability(profile, t.capability));
  const requested = params.get('onglet');
  const active = available.find(t => t.key === requested) || available[0];

  if (!active) return null;

  return (
    <div>
      {available.length > 1 && (
        <div className="px-6 pt-6">
          <div className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-lg" role="tablist">
            {available.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={t.key === active.key}
                onClick={() => setParams({ onglet: t.key })}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${t.key === active.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {active.key === 'coaching' ? <DevelopmentCenterPage /> : <TrainingModulesPage />}
    </div>
  );
}
