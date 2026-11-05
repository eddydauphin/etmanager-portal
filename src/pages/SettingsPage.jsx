import { Link } from 'react-router-dom';
import { KeyRound, Boxes, Building2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { PARKED_MODULES, setFeature, useFeatures } from '../lib/features';

const ROLE_LABELS = {
  super_admin: 'Super admin',
  client_admin: 'Admin client',
  category_admin: 'Admin catégorie',
  site_admin: 'Admin site',
  team_lead: "Chef d'équipe",
  trainee: 'Apprenant'
};

export default function SettingsPage() {
  const { profile } = useAuth();
  const features = useFeatures();
  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600">Votre compte et les modules actifs.</p>
      </div>

      <section className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-900">Mon compte</div>
        <dl className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500">Nom</dt><dd className="font-medium text-gray-900">{profile?.full_name || '—'}</dd></div>
          <div><dt className="text-gray-500">E-mail</dt><dd className="font-medium text-gray-900 truncate">{profile?.email || '—'}</dd></div>
          <div><dt className="text-gray-500">Rôle</dt><dd className="font-medium text-gray-900">{ROLE_LABELS[profile?.role] || profile?.role || '—'}</dd></div>
          {profile?.department && <div><dt className="text-gray-500">Service</dt><dd className="font-medium text-gray-900">{profile.department}{profile.line ? ` / ${profile.line}` : ''}</dd></div>}
        </dl>
        <div className="px-5 pb-4">
          <Link to="/change-password" className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <KeyRound className="w-4 h-4" /> Changer mon mot de passe
          </Link>
        </div>
      </section>

      {isSuperAdmin && (
        <section className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-900">Administration</div>
          <div className="px-5 py-4">
            <Link to="/clients" className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <Building2 className="w-4 h-4" /> Organisations clientes
            </Link>
            <p className="mt-2 text-xs text-gray-500">Créer ou modifier les organisations. Retiré du menu principal.</p>
          </div>
        </section>
      )}

      {isSuperAdmin && (
        <section className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-gray-900">Modules en pause</span>
          </div>
          <div className="px-5 py-2 divide-y divide-gray-100">
            {PARKED_MODULES.map(m => {
              const on = features[m.key] !== false;
              return (
                <label key={m.key} className="flex items-start gap-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => setFeature(m.key, e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1">
                    <span className="block font-medium text-gray-900">{m.label}</span>
                    <span className="block text-sm text-gray-500">{m.description}</span>
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{on ? 'Actif' : 'En pause'}</span>
                </label>
              );
            })}
          </div>
          <p className="px-5 pb-4 text-xs text-gray-500">Un module en pause disparaît du menu et ses pages redirigent vers le tableau de bord. Les données existantes sont conservées. Réglage enregistré sur ce navigateur.</p>
        </section>
      )}
    </div>
  );
}
