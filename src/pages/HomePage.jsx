import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  Users, GraduationCap, Rocket, Network, AlertTriangle, Loader2, ArrowRight, Target, BookOpen, UserPlus, Plus
} from 'lucide-react';

/**
 * Tableau de bord allégé.
 *
 * Deux vues : encadrants (ce qui est en retard, ce qui est en cours, où agir)
 * et apprenants (ce qu'il me reste à faire). Pas de graphique, pas d'onglet :
 * des chiffres, deux listes, des raccourcis.
 */

const MANAGER_ROLES = ['super_admin', 'client_admin', 'category_admin', 'site_admin', 'team_lead'];
const OPEN_TRAINING = ['pending', 'in_progress', 'assigned', 'not_started'];
const OPEN_ACTIVITY = ['pending', 'in_progress', 'overdue'];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');
const isLate = (row) => row.due_date && new Date(row.due_date) < new Date();
const firstName = (name) => (name || '').split(' ')[0];

const TRAINING_STATUS = {
  pending: { label: 'À faire', cls: 'bg-gray-100 text-gray-700' },
  assigned: { label: 'À faire', cls: 'bg-gray-100 text-gray-700' },
  not_started: { label: 'À faire', cls: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'En cours', cls: 'bg-blue-100 text-blue-700' },
  passed: { label: 'Réussie', cls: 'bg-green-100 text-green-700' },
  completed: { label: 'Terminée', cls: 'bg-green-100 text-green-700' },
  failed: { label: 'À refaire', cls: 'bg-red-100 text-red-700' }
};

const ACTIVITY_STATUS = {
  pending: { label: 'À démarrer', cls: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'En cours', cls: 'bg-blue-100 text-blue-700' },
  overdue: { label: 'En retard', cls: 'bg-red-100 text-red-700' },
  completed: { label: 'Terminée', cls: 'bg-green-100 text-green-700' },
  validated: { label: 'Validée', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', cls: 'bg-gray-100 text-gray-500' }
};

const ACTIVITY_TYPE = {
  formal_education: 'Formation',
  learn_by_doing: 'Mise en pratique',
  learn_through_others: 'Coaching',
  coaching: 'Coaching',
  mentoring: 'Mentorat',
  project: 'Projet'
};

function Kpi({ icon: Icon, value, label, tone = 'text-gray-900', to }) {
  const body = (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 h-full">
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5 text-gray-500" /></div>
      <div>
        <p className={`text-2xl font-bold leading-tight ${tone}`}>{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to} className="block hover:shadow-sm rounded-xl">{body}</Link> : body;
}

function Panel({ title, to, linkLabel = 'Tout voir', children }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {to && <Link to={to} className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">{linkLabel} <ArrowRight className="w-3.5 h-3.5" /></Link>}
      </div>
      <div className="px-5 py-2">{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-gray-500 py-3">{children}</p>;
}

function Row({ left, sub, right, late }) {
  return (
    <div className="py-2.5 flex items-center gap-3 text-sm border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{left}</p>
        {sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}
      </div>
      {late && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" aria-label="En retard" />}
      {right}
    </div>
  );
}

function Shortcut({ icon: Icon, label, to }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/40">
      <Icon className="w-5 h-5 text-blue-600" />
      <span className="text-sm font-medium text-gray-900">{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------- Encadrants
function ManagerHome({ profile }) {
  const isSuperAdmin = profile.role === 'super_admin';
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(profile.client_id || '');
  const [data, setData] = useState({ people: [], trainings: [], activities: [], modules: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) return;
    dbFetch('clients?select=id,name&order=name.asc').then(d => setClients(d || [])).catch(() => {});
  }, [isSuperAdmin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const scope = clientId ? `&client_id=eq.${clientId}` : '';
        const teamScope = profile.role === 'team_lead' ? `&reports_to_id=eq.${profile.id}` : '';
        const safe = (q) => q.catch(e => { console.error('Tableau de bord :', e); return []; });
        const [people, trainings, activities, modules] = await Promise.all([
          safe(dbFetch(`profiles?select=id,full_name,role,client_id,is_active&is_active=eq.true&role=neq.super_admin${scope}${teamScope}`)),
          safe(dbFetch(`user_training?select=id,status,due_date,completed_at,user_id,person:user_id!inner(full_name,client_id,reports_to_id),training_modules:module_id(title)&order=due_date.asc.nullslast${clientId ? `&person.client_id=eq.${clientId}` : ''}${profile.role === 'team_lead' ? `&person.reports_to_id=eq.${profile.id}` : ''}`)),
          safe(dbFetch(`development_activities?select=id,title,type,status,due_date,trainee_id,coach_id,trainee:trainee_id!inner(full_name,client_id,reports_to_id),coach:coach_id(full_name),competencies(name)&status=neq.cancelled&order=due_date.asc.nullslast${clientId ? `&trainee.client_id=eq.${clientId}` : ''}${profile.role === 'team_lead' ? `&trainee.reports_to_id=eq.${profile.id}` : ''}`)),
          safe(dbFetch(`training_modules?select=id,title,status,client_id${scope}`)
        ]);
        if (cancelled) return;
        setData({ people: people || [], trainings: trainings || [], activities: activities || [], modules: modules || [] });
      } catch (e) {
        console.error('Tableau de bord :', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, profile.id, profile.role]);

  const openTrainings = useMemo(() => data.trainings.filter(t => OPEN_TRAINING.includes(t.status)), [data.trainings]);
  const lateTrainings = useMemo(() => openTrainings.filter(isLate), [openTrainings]);
  const openActivities = useMemo(() => data.activities.filter(a => OPEN_ACTIVITY.includes(a.status)), [data.activities]);
  const published = data.modules.filter(m => m.status === 'published').length;
  const inReview = data.modules.filter(m => ['submitted', 'content_approved', 'returned'].includes(m.status)).length;

  const clientLabel = isSuperAdmin ? (clients.find(c => c.id === clientId)?.name || 'Tous les clients') : null;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour {firstName(profile.full_name)}</h1>
          <p className="text-gray-600">{loading ? 'Chargement…' : lateTrainings.length === 0 && openActivities.filter(isLate).length === 0 ? 'Rien en retard.' : `${lateTrainings.length + openActivities.filter(isLate).length} élément(s) en retard à traiter.`}</p>
        </div>
        {isSuperAdmin && (
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" aria-label="Client">
            <option value="">Tous les clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={Users} value={data.people.length} label={clientLabel ? `Personnes · ${clientLabel}` : 'Personnes'} to="/users" />
            <Kpi icon={GraduationCap} value={openTrainings.length} label="Formations en cours" to="/training" />
            <Kpi icon={AlertTriangle} value={lateTrainings.length} label="Formations en retard" tone={lateTrainings.length ? 'text-red-600' : 'text-green-600'} to="/training" />
            <Kpi icon={Rocket} value={openActivities.length} label="Actions de coaching en cours" to="/training?onglet=coaching" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Formations à suivre" to="/training">
              {openTrainings.length === 0 ? <Empty>Aucune formation en cours. Assignez-en une depuis Formations.</Empty> : openTrainings.slice(0, 8).map(t => (
                <Row key={t.id}
                  left={t.training_modules?.title || 'Formation'}
                  sub={t.person?.full_name}
                  late={isLate(t)}
                  right={<span className={`text-xs px-2 py-0.5 rounded ${(TRAINING_STATUS[t.status] || TRAINING_STATUS.pending).cls}`}>{t.due_date ? `Échéance ${fmtDate(t.due_date)}` : (TRAINING_STATUS[t.status] || TRAINING_STATUS.pending).label}</span>}
                />
              ))}
            </Panel>

            <Panel title="Coaching en cours" to="/training?onglet=coaching">
              {openActivities.length === 0 ? <Empty>Aucune action de coaching en cours. Lancez-en une depuis Formations.</Empty> : openActivities.slice(0, 8).map(a => (
                <Row key={a.id}
                  left={a.title || a.competencies?.name || 'Action de développement'}
                  sub={[a.trainee?.full_name, a.coach?.full_name ? `avec ${a.coach.full_name}` : null, ACTIVITY_TYPE[a.type]].filter(Boolean).join(' · ')}
                  late={isLate(a)}
                  right={<span className={`text-xs px-2 py-0.5 rounded ${(ACTIVITY_STATUS[a.status] || ACTIVITY_STATUS.pending).cls}`}>{(ACTIVITY_STATUS[a.status] || ACTIVITY_STATUS.pending).label}</span>}
                />
              ))}
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Panel title="Supports de formation" to="/training">
              <div className="py-2 grid grid-cols-3 gap-3 text-center">
                <div><p className="text-xl font-bold text-gray-900">{data.modules.length}</p><p className="text-xs text-gray-500">Au total</p></div>
                <div><p className="text-xl font-bold text-green-600">{published}</p><p className="text-xs text-gray-500">Publiés</p></div>
                <div><p className="text-xl font-bold text-amber-600">{inReview}</p><p className="text-xs text-gray-500">En relecture</p></div>
              </div>
            </Panel>
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Shortcut icon={UserPlus} label="Ajouter une personne" to="/users?action=add" />
              <Shortcut icon={Plus} label="Créer une formation" to="/training" />
              <Shortcut icon={Rocket} label="Lancer un coaching" to="/training?onglet=coaching" />
              <Shortcut icon={Network} label="Réseau d’experts" to="/expert-network" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Apprenants
function TraineeHome({ profile }) {
  const [trainings, setTrainings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, a, c] = await Promise.all([
          dbFetch(`user_training?select=id,status,due_date,completed_at,best_score,training_modules:module_id(title)&user_id=eq.${profile.id}&order=due_date.asc.nullslast`),
          dbFetch(`development_activities?select=id,title,type,status,due_date,coach:coach_id(full_name),competencies(name)&trainee_id=eq.${profile.id}&status=neq.cancelled&order=due_date.asc.nullslast`),
          dbFetch(`user_competencies?select=id,current_level,target_level,competencies(name)&user_id=eq.${profile.id}`)
        ]);
        if (cancelled) return;
        setTrainings(t || []); setActivities(a || []); setCompetencies(c || []);
      } catch (e) {
        console.error('Tableau de bord :', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile.id]);

  const todo = trainings.filter(t => OPEN_TRAINING.includes(t.status));
  const done = trainings.filter(t => ['passed', 'completed'].includes(t.status));
  const open = activities.filter(a => OPEN_ACTIVITY.includes(a.status));
  const atTarget = competencies.filter(c => Number(c.target_level) > 0 && Number(c.current_level) >= Number(c.target_level)).length;

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour {firstName(profile.full_name)}</h1>
        <p className="text-gray-600">{loading ? 'Chargement…' : todo.length === 0 && open.length === 0 ? 'Rien à faire pour le moment.' : `${todo.length} formation(s) et ${open.length} action(s) de coaching à faire.`}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={BookOpen} value={todo.length} label="Formations à faire" tone={todo.some(isLate) ? 'text-red-600' : 'text-gray-900'} to="/my-training" />
            <Kpi icon={GraduationCap} value={done.length} label="Formations réussies" to="/my-training" />
            <Kpi icon={Target} value={`${atTarget}/${competencies.length}`} label="Compétences au niveau cible" to="/my-progress" />
            <Kpi icon={Rocket} value={open.length} label="Actions de coaching" to="/development" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Mes formations" to="/my-training" linkLabel="Ouvrir">
              {todo.length === 0 ? <Empty>Aucune formation à faire.</Empty> : todo.slice(0, 8).map(t => (
                <Row key={t.id} left={t.training_modules?.title || 'Formation'} sub={t.due_date ? `Échéance ${fmtDate(t.due_date)}` : null} late={isLate(t)}
                  right={<span className={`text-xs px-2 py-0.5 rounded ${(TRAINING_STATUS[t.status] || TRAINING_STATUS.pending).cls}`}>{(TRAINING_STATUS[t.status] || TRAINING_STATUS.pending).label}</span>} />
              ))}
            </Panel>
            <Panel title="Mon coaching" to="/development" linkLabel="Ouvrir">
              {open.length === 0 ? <Empty>Aucune action de coaching en cours.</Empty> : open.slice(0, 8).map(a => (
                <Row key={a.id} left={a.title || a.competencies?.name || 'Action de développement'} sub={[a.coach?.full_name ? `avec ${a.coach.full_name}` : null, ACTIVITY_TYPE[a.type], a.due_date ? `échéance ${fmtDate(a.due_date)}` : null].filter(Boolean).join(' · ')} late={isLate(a)}
                  right={<span className={`text-xs px-2 py-0.5 rounded ${(ACTIVITY_STATUS[a.status] || ACTIVITY_STATUS.pending).cls}`}>{(ACTIVITY_STATUS[a.status] || ACTIVITY_STATUS.pending).label}</span>} />
              ))}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  const { profile } = useAuth();
  if (!profile) return null;
  return MANAGER_ROLES.includes(profile.role) ? <ManagerHome profile={profile} /> : <TraineeHome profile={profile} />;
}
