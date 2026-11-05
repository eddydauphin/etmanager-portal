import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  ArrowLeft, ClipboardCheck, Play, Target, GraduationCap, Loader2, AlertCircle, Mail, Hash, Building2, Users
} from 'lucide-react';

const ROLE_LABELS = {
  super_admin: 'Super admin',
  client_admin: 'Admin client',
  category_admin: 'Admin catégorie',
  site_admin: 'Admin site',
  team_lead: 'Chef d’équipe',
  trainee: 'Apprenant'
};

const SOP_STATUS = {
  draft: { label: 'Brouillon', cls: 'bg-gray-100 text-gray-700' },
  pending_review: { label: 'En relecture', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approuvé', cls: 'bg-blue-100 text-blue-700' },
  published: { label: 'Publié', cls: 'bg-green-100 text-green-700' },
  archived: { label: 'Archivé', cls: 'bg-gray-100 text-gray-500' }
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

function Section({ icon: Icon, title, count, children }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <Icon className="w-4 h-4 text-blue-600" />
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {typeof count === 'number' && <span className="ml-auto text-sm text-gray-500">{count}</span>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-gray-500 py-2">{children}</p>;
}

/**
 * UserDetailPage - one person, everything assigned to them.
 * Route: /users/:id (profiles.id). Managers reach it from the Users list.
 */
export default function UserDetailPage() {
  const { id } = useParams();
  const { profile: viewer } = useAuth();

  const [person, setPerson] = useState(null);
  const [client, setClient] = useState(null);
  const [manager, setManager] = useState(null);
  const [sopsToWrite, setSopsToWrite] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [training, setTraining] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [p] = await dbFetch(`profiles?id=eq.${id}&select=*`);
        if (!p) throw new Error('Personne introuvable');
        if (viewer?.role !== 'super_admin' && viewer?.client_id && p.client_id !== viewer.client_id) {
          throw new Error('Cette personne n’est pas dans votre organisation');
        }
        const [clientRow, managerRow, sops, execs, comps, trains] = await Promise.all([
          p.client_id ? dbFetch(`clients?id=eq.${p.client_id}&select=id,name`) : [],
          p.reports_to_id ? dbFetch(`profiles?id=eq.${p.reports_to_id}&select=id,full_name`) : [],
          dbFetch(`sops?assigned_to=eq.${id}&select=id,sop_number,title,status,risk_level,due_date,created_at&order=created_at.desc`),
          dbFetch(`sop_executions?executed_by=eq.${id}&select=id,sop_id,sop_title,status,signoff_status,started_at,completed_at&order=started_at.desc&limit=50`),
          dbFetch(`user_competencies?user_id=eq.${id}&select=*,competencies(id,name)&order=created_at.desc`),
          dbFetch(`user_training?user_id=eq.${id}&select=*,training_modules(id,title)&order=created_at.desc`)
        ]);
        if (cancelled) return;
        setPerson(p);
        setClient(clientRow?.[0] || null);
        setManager(managerRow?.[0] || null);
        setSopsToWrite(sops || []);
        setExecutions(execs || []);
        setCompetencies(comps || []);
        setTraining(trains || []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Chargement impossible');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, viewer?.role, viewer?.client_id]);

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to="/users" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"><ArrowLeft className="w-4 h-4" /> Personnes</Link>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"><AlertCircle className="w-5 h-5" />{error}</div>
      </div>
    );
  }

  const initial = person.full_name?.[0]?.toUpperCase() || person.email?.[0]?.toUpperCase() || '?';
  const openSops = sopsToWrite.filter(s => s.status !== 'published' && s.status !== 'archived');

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <Link to="/users" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"><ArrowLeft className="w-4 h-4" /> Personnes</Link>

      {/* Identity */}
      <header className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-blue-600 text-white text-2xl font-semibold flex items-center justify-center flex-shrink-0">{initial}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{person.full_name || 'Sans nom'}</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{ROLE_LABELS[person.role] || person.role}</span>
            {person.is_active === false && <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Inactif</span>}
          </div>
          <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2 min-w-0"><Mail className="w-4 h-4 text-gray-400" /><span className="truncate">{person.email}</span></div>
            {person.employee_number && <div className="flex items-center gap-2"><Hash className="w-4 h-4 text-gray-400" />{person.employee_number}</div>}
            {client && <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" />{client.name}{person.site ? ` — ${person.site}` : ''}</div>}
            {(person.department || person.line) && <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" />{[person.department, person.line].filter(Boolean).join(' / ')}</div>}
            {manager && <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" />Rattaché à <Link to={`/users/${manager.id}`} className="text-blue-600 hover:underline">{manager.full_name}</Link></div>}
            {person.hire_date && <div className="text-gray-500">Embauché le {fmtDate(person.hire_date)}</div>}
          </dl>
        </div>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Procédures à rédiger', openSops.length],
          ['Procédures exécutées', executions.filter(e => e.status === 'completed').length],
          ['Compétences', competencies.length],
          ['Formations', training.length]
        ].map(([label, n]) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-2xl font-bold text-gray-900">{n}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* SOPs */}
      <Section icon={ClipboardCheck} title="Procédures" count={sopsToWrite.length + executions.length}>
        <h3 className="text-sm font-medium text-gray-700 mb-2">À rédiger</h3>
        {sopsToWrite.length === 0 ? <Empty>Aucune procédure à rédiger n’est assignée à cette personne.</Empty> : (
          <ul className="divide-y divide-gray-100 border-y border-gray-100 mb-5">
            {sopsToWrite.map(s => {
              const st = SOP_STATUS[s.status] || SOP_STATUS.draft;
              const overdue = s.due_date && new Date(s.due_date) < new Date() && s.status !== 'published';
              return (
                <li key={s.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-gray-500 w-20 flex-shrink-0">{s.sop_number || 'NEW'}</span>
                  <Link to="/sops" className="flex-1 min-w-0 truncate font-medium text-gray-900 hover:text-blue-600">{s.title}</Link>
                  <span className={`text-xs px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                  <span className={`text-xs w-24 text-right ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{s.due_date ? `Échéance ${fmtDate(s.due_date)}` : ''}</span>
                </li>
              );
            })}
          </ul>
        )}

        <h3 className="text-sm font-medium text-gray-700 mb-2 mt-4">Exécutions</h3>
        {executions.length === 0 ? <Empty>Aucune procédure exécutée.</Empty> : (
          <ul className="divide-y divide-gray-100 border-y border-gray-100">
            {executions.map(e => (
              <li key={e.id} className="py-2.5 flex items-center gap-3 text-sm">
                <Play className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 min-w-0 truncate font-medium text-gray-900">{e.sop_title || 'SOP'}</span>
                <span className="text-xs text-gray-500">{fmtDate(e.completed_at || e.started_at)}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${e.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{e.status === 'completed' ? 'Terminé' : 'En cours'}</span>
                {e.status === 'completed' && (
                  <span className={`text-xs px-2 py-0.5 rounded ${e.signoff_status === 'approved' ? 'bg-green-100 text-green-700' : e.signoff_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {e.signoff_status === 'approved' ? 'Validé' : e.signoff_status === 'rejected' ? 'Validation refusée' : 'En attente de validation'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Competencies */}
      <Section icon={Target} title="Compétences" count={competencies.length}>
        {competencies.length === 0 ? <Empty>Aucune compétence assignée.</Empty> : (
          <ul className="divide-y divide-gray-100 border-y border-gray-100">
            {competencies.map(c => {
              const cur = Number(c.current_level) || 0;
              const tgt = Number(c.target_level) || 0;
              return (
                <li key={c.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <span className="flex-1 min-w-0 truncate font-medium text-gray-900">{c.competencies?.name || 'Compétence'}</span>
                  <span className="text-xs text-gray-500 w-28 text-right">Niveau {cur} of {tgt || '—'}</span>
                  <span className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden" aria-hidden="true">
                    <span className={`block h-full ${cur >= tgt && tgt > 0 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (cur / 5) * 100)}%` }} />
                  </span>
                  {c.status && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 capitalize">{String(c.status).replace(/_/g, ' ')}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Training */}
      <Section icon={GraduationCap} title="Formation" count={training.length}>
        {training.length === 0 ? <Empty>Aucune formation assignée.</Empty> : (
          <ul className="divide-y divide-gray-100 border-y border-gray-100">
            {training.map(t => (
              <li key={t.id} className="py-2.5 flex items-center gap-3 text-sm">
                <span className="flex-1 min-w-0 truncate font-medium text-gray-900">{t.training_modules?.title || 'Training module'}</span>
                {t.best_score != null && <span className="text-xs text-gray-500">Meilleur {t.best_score}%</span>}
                <span className="text-xs text-gray-500 w-24 text-right">{t.completed_at ? `Terminé ${fmtDate(t.completed_at)}` : t.due_date ? `Échéance ${fmtDate(t.due_date)}` : ''}</span>
                <span className={`text-xs px-2 py-0.5 rounded capitalize ${t.status === 'completed' ? 'bg-green-100 text-green-700' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{String(t.status || 'pas commencé').replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
