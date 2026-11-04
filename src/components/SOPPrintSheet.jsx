import { useEffect } from 'react';
import { Printer, X } from 'lucide-react';

/**
 * SOPPrintSheet - the standard printed format of an SOP.
 *
 * One A4 document: identification strip, control block, PPE and hazard
 * summary, the numbered steps, and a sign-off block. Opened as a full-screen
 * overlay from the SOP viewer; "Print" uses the browser print dialog and the
 * `.sop-print-root` rules in index.css hide the rest of the app on paper.
 */
export default function SOPPrintSheet({
  sop,
  steps = [],
  equipment = [],
  catalogName,
  clientName,
  ownerName,
  authorName,
  approverName,
  ppeTypes = {},
  safetyWarnings = {},
  riskColors = {},
  statusColors = {},
  onClose
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!sop) return null;

  const risk = riskColors[sop.risk_level] || { label: sop.risk_level || 'Medium' };
  const status = statusColors[sop.status] || { label: sop.status || 'Draft' };

  const allPPE = [...new Set(steps.flatMap(s => s.ppe_required || []))];
  const allHazards = [...new Set(steps.flatMap(s => s.safety_icons || []))];

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
  const riskBand = {
    low: 'bg-green-600',
    medium: 'bg-amber-500',
    high: 'bg-orange-600',
    critical: 'bg-red-700'
  }[sop.risk_level] || 'bg-amber-500';

  const control = [
    ['Document', sop.sop_number || 'NEW'],
    ['Version', `v${sop.version || 1}`],
    ['Status', status.label],
    ['Risk level', risk.label],
    ['Client', clientName || '—'],
    ['Catalog', catalogName || '—'],
    ['Owner', ownerName || '—'],
    ['Author', authorName || '—'],
    ['Approved by', approverName ? `${approverName}, ${fmtDate(sop.approved_at)}` : 'Not yet approved'],
    ['Next review', fmtDate(sop.next_review_date)],
    ['Duration', sop.estimated_duration_minutes ? `~${sop.estimated_duration_minutes} min` : '—'],
    ['Supervisor sign-off', (sop.requires_supervisor_signoff ?? true) ? 'Required' : 'Not required']
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-slate-800/70 overflow-y-auto sop-print-overlay">
      {/* Toolbar (screen only) */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-slate-900 text-white print:hidden">
        <div className="text-sm">
          <span className="font-semibold">Standard format</span>
          <span className="text-slate-300"> — {sop.sop_number || 'NEW'} {sop.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-slate-900 rounded-md text-sm font-medium hover:bg-slate-100"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* The sheet */}
      <div className="sop-print-root mx-auto my-6 bg-white text-slate-900 shadow-2xl print:shadow-none print:my-0" style={{ width: '210mm', minHeight: '297mm' }}>
        {/* Identification strip */}
        <header className="flex items-stretch border-b-4 border-slate-900">
          <div className={`w-3 ${riskBand}`} aria-hidden="true" />
          <div className="flex-1 px-8 pt-7 pb-5">
            <div className="flex items-baseline justify-between gap-6">
              <span className="font-mono text-3xl font-semibold tracking-tight">{sop.sop_number || 'NEW'}</span>
              <span className="text-sm text-slate-500">Standard Operating Procedure</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">{sop.title}</h1>
            {sop.description && <p className="mt-2 text-sm leading-relaxed text-slate-600 max-w-prose">{sop.description}</p>}
          </div>
        </header>

        {/* Control block */}
        <section className="px-8 py-5 border-b border-slate-300">
          <dl className="grid grid-cols-4 gap-x-6 gap-y-3 text-sm">
            {control.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="font-medium truncate" title={String(v)}>{v}</dd>
              </div>
            ))}
          </dl>
          {equipment.length > 0 && (
            <div className="mt-4 text-sm">
              <span className="text-xs text-slate-500">Equipment</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {equipment.map(e => (
                  <span key={e.id || e.name} className="px-2 py-0.5 border border-slate-400 rounded text-xs font-medium">
                    {e.code ? `${e.code} — ` : ''}{e.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* PPE + hazards summary */}
        <section className="grid grid-cols-2 border-b border-slate-300">
          <div className="px-8 py-4 border-r border-slate-300">
            <h2 className="text-sm font-semibold">Personal protective equipment</h2>
            {allPPE.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">None specified</p>
            ) : (
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {allPPE.map(code => (
                  <li key={code} className="flex items-center gap-2">
                    <span aria-hidden="true">{ppeTypes[code]?.emoji || '•'}</span>
                    <span>{ppeTypes[code]?.name || code}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="px-8 py-4">
            <h2 className="text-sm font-semibold">Hazards and controls</h2>
            {allHazards.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">None specified</p>
            ) : (
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {allHazards.map(code => (
                  <li key={code} className="flex items-center gap-2">
                    <span aria-hidden="true">{safetyWarnings[code]?.emoji || '•'}</span>
                    <span>{safetyWarnings[code]?.name || code}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Steps */}
        <section className="px-8 py-5">
          <h2 className="text-sm font-semibold mb-3">Procedure</h2>
          {steps.length === 0 ? (
            <p className="text-sm text-slate-500">No steps written yet.</p>
          ) : (
            <ol className="divide-y divide-slate-200 border-y border-slate-300">
              {steps.map((s, i) => (
                <li key={s.id || i} className="grid grid-cols-[2.5rem_1fr_auto] gap-4 py-3 break-inside-avoid">
                  <span className="font-mono text-lg font-semibold leading-none pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 text-sm">
                    {s.title && <p className="font-medium">{s.title}</p>}
                    <p className="leading-relaxed text-slate-800 whitespace-pre-line">{s.instruction_text}</p>
                    {((s.ppe_required?.length || 0) + (s.safety_icons?.length || 0)) > 0 && (
                      <p className="mt-1.5 text-xs text-slate-600">
                        {(s.safety_icons || []).map(c => safetyWarnings[c] ? `${safetyWarnings[c].emoji} ${safetyWarnings[c].name}` : c).join('   ')}
                        {s.safety_icons?.length > 0 && s.ppe_required?.length > 0 ? '   ' : ''}
                        {(s.ppe_required || []).map(c => ppeTypes[c] ? `${ppeTypes[c].emoji} ${ppeTypes[c].name}` : c).join('   ')}
                      </p>
                    )}
                    {(s.requires_photo || s.requires_comment) && (
                      <p className="mt-1 text-xs text-slate-500">
                        {[s.requires_photo && 'Photo evidence required', s.requires_comment && 'Comment required'].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {s.image_url ? (
                    <img src={s.image_url} alt="" className="w-24 h-24 object-cover border border-slate-300" />
                  ) : (
                    <span className="w-24" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Sign-off block */}
        <section className="px-8 pb-8 break-inside-avoid">
          <h2 className="text-sm font-semibold mb-3">Sign-off</h2>
          <div className="grid grid-cols-3 gap-6 text-sm">
            {['Operator', 'Supervisor', 'Trainer'].map(role => (
              <div key={role}>
                <p className="text-xs text-slate-500">{role}</p>
                <div className="mt-8 border-b border-slate-900" />
                <p className="mt-1 text-xs text-slate-500">Name, signature, date</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-500">
            Printed {new Date().toLocaleDateString()} from E&T Manager. The system version is the controlled copy; a printed copy is uncontrolled after the next review date.
          </p>
        </section>
      </div>
    </div>
  );
}
