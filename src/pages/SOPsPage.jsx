import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import { supabase } from '../lib/supabase';
import { 
  ClipboardCheck, Search, Plus, ChevronRight, ChevronDown,
  Folder, FolderOpen, FileText, Play,
  Eye, Edit, QrCode, Clock, CheckCircle,
  AlertTriangle, Volume2, X, Check, Loader2,
  Building2, RefreshCw, Send, Camera,
  ChevronLeft, Trash2, Save, PlusCircle, User,
  Sparkles, Upload, Image
} from 'lucide-react';

// ============================================================================
// PPE TYPES - Full industry list with emojis and categories
// ============================================================================
const PPE_TYPES = {
  // Head Protection
  hard_hat: { emoji: '🪖', name: 'Hard Hat / Helmet', category: 'Head' },
  hairnet: { emoji: '👒', name: 'Hairnet / Cap', category: 'Head' },
  beard_net: { emoji: '🧔', name: 'Beard Net', category: 'Head' },
  // Eye & Face
  safety_glasses: { emoji: '👓', name: 'Safety Glasses', category: 'Eye & Face' },
  goggles: { emoji: '🥽', name: 'Goggles', category: 'Eye & Face' },
  face_shield: { emoji: '🛡️', name: 'Face Shield', category: 'Eye & Face' },
  // Respiratory
  dust_mask: { emoji: '😷', name: 'Dust Mask', category: 'Respiratory' },
  respirator: { emoji: '🫁', name: 'Respirator', category: 'Respiratory' },
  // Hands
  gloves_general: { emoji: '🧤', name: 'Work Gloves', category: 'Hands' },
  gloves_chemical: { emoji: '🧪', name: 'Chemical Gloves', category: 'Hands' },
  gloves_heat: { emoji: '🔥', name: 'Heat-Resistant Gloves', category: 'Hands' },
  gloves_cut: { emoji: '🔪', name: 'Cut-Resistant Gloves', category: 'Hands' },
  gloves_nitrile: { emoji: '💙', name: 'Nitrile Gloves', category: 'Hands' },
  // Body
  lab_coat: { emoji: '🥼', name: 'Lab Coat', category: 'Body' },
  coveralls: { emoji: '👔', name: 'Coveralls', category: 'Body' },
  apron: { emoji: '🧷', name: 'Apron', category: 'Body' },
  high_vis: { emoji: '🦺', name: 'High-Vis Vest', category: 'Body' },
  // Feet
  safety_boots: { emoji: '🥾', name: 'Safety Boots', category: 'Feet' },
  rubber_boots: { emoji: '💧', name: 'Rubber Boots', category: 'Feet' },
  shoe_covers: { emoji: '👟', name: 'Shoe Covers', category: 'Feet' },
  esd_shoes: { emoji: '⚡', name: 'ESD Footwear', category: 'Feet' },
  // Hearing
  ear_plugs: { emoji: '👂', name: 'Ear Plugs', category: 'Hearing' },
  ear_muffs: { emoji: '🎧', name: 'Ear Muffs', category: 'Hearing' },
  // Other
  knee_pads: { emoji: '🦵', name: 'Knee Pads', category: 'Other' },
  fall_harness: { emoji: '🪢', name: 'Fall Harness', category: 'Other' },
  anti_static: { emoji: '⚡', name: 'Anti-Static Gear', category: 'Other' }
};

// ============================================================================
// SAFETY WARNINGS - Hazards and procedural requirements  
// ============================================================================
const SAFETY_WARNINGS = {
  loto: { emoji: '🔒', name: 'Lockout/Tagout', color: 'bg-red-100 text-red-700 border-red-300' },
  confined_space: { emoji: '🚪', name: 'Confined Space', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  hot_work: { emoji: '🔥', name: 'Hot Work Permit', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  high_temp: { emoji: '🌡️', name: 'High Temperature', color: 'bg-red-100 text-red-700 border-red-300' },
  cold_temp: { emoji: '❄️', name: 'Low Temperature', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  chemical: { emoji: '☠️', name: 'Chemical Hazard', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  biological: { emoji: '☣️', name: 'Biological Hazard', color: 'bg-lime-100 text-lime-700 border-lime-300' },
  electrical: { emoji: '⚡', name: 'Electrical Hazard', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  noise: { emoji: '🔊', name: 'High Noise', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  pressure: { emoji: '💨', name: 'Pressure Hazard', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  moving_parts: { emoji: '⚙️', name: 'Moving Parts', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  falling_objects: { emoji: '⬇️', name: 'Falling Objects', color: 'bg-red-100 text-red-700 border-red-300' },
  slippery: { emoji: '💧', name: 'Slippery Surface', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  height: { emoji: '📏', name: 'Working at Height', color: 'bg-violet-100 text-violet-700 border-violet-300' },
  heavy_lifting: { emoji: '🏋️', name: 'Heavy Lifting', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  caution: { emoji: '⚠️', name: 'General Caution', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  inspect: { emoji: '👁️', name: 'Inspection Required', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  verify: { emoji: '✅', name: 'Verification Required', color: 'bg-green-100 text-green-700 border-green-300' },
  two_person: { emoji: '👥', name: 'Two Person Task', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  supervisor: { emoji: '👔', name: 'Supervisor Required', color: 'bg-violet-100 text-violet-700 border-violet-300' }
};

const RISK_COLORS = {
  low: { bg: 'bg-green-100', text: 'text-green-700', label: 'Low' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' }
};

const STATUS_COLORS = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  pending_review: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Review' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Approved' },
  published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Published' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Archived' }
};

// ============================================================================
// MULTI-SELECT COMPONENT for PPE and Safety Warnings
// ============================================================================
const MultiSelectCheckbox = ({ label, options, selected = [], onChange, grouped = false }) => {
  const categories = grouped ? [...new Set(Object.values(options).map(o => o.category))].filter(Boolean) : [];
  
  const toggleItem = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter(s => s !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  if (grouped && categories.length > 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-3">
          {categories.map(category => (
            <div key={category}>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{category}</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(options).filter(([_, opt]) => opt.category === category).map(([code, opt]) => (
                  <label key={code} className={`inline-flex items-center gap-1 px-2 py-1 rounded border cursor-pointer text-xs ${selected.includes(code) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selected.includes(code)} onChange={() => toggleItem(code)} className="sr-only" />
                    <span>{opt.emoji}</span>
                    <span>{opt.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto border rounded-lg p-2">
        {Object.entries(options).map(([code, opt]) => (
          <label key={code} className={`inline-flex items-center gap-1 px-2 py-1 rounded border cursor-pointer text-xs ${selected.includes(code) ? (opt.color || 'bg-blue-100 border-blue-300 text-blue-800') : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
            <input type="checkbox" checked={selected.includes(code)} onChange={() => toggleItem(code)} className="sr-only" />
            <span>{opt.emoji}</span>
            <span>{opt.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// EQUIPMENT MULTI-SELECT COMPONENT
// ============================================================================
const EquipmentMultiSelect = ({ equipment, selected = [], onChange }) => {
  const toggleEquipment = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        <Building2 className="w-4 h-4" /> Applicable Equipment
      </label>
      <div className="max-h-48 overflow-y-auto bg-white border rounded-lg p-2 space-y-1">
        {equipment.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No equipment defined. Create equipment first.</p>
        ) : equipment.map(eq => (
          <label key={eq.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${selected.includes(eq.id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
            <input 
              type="checkbox" 
              checked={selected.includes(eq.id)} 
              onChange={() => toggleEquipment(eq.id)} 
              className="w-4 h-4 rounded text-blue-600 border-gray-300" 
            />
            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{eq.name}</span>
              {eq.code && <span className="text-xs text-gray-500 ml-2">({eq.code})</span>}
            </div>
            {eq.site && <span className="text-xs text-gray-400">{eq.site}</span>}
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-blue-600 mt-2 font-medium">✓ {selected.length} equipment selected</p>
      )}
    </div>
  );
};

// ============================================================================
// SMART PICKER COMPONENT - Compact, fun, mobile-friendly
// ============================================================================
const SmartPicker = ({ label, icon, options, selected = [], onChange, grouped = false, color = 'blue' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const categories = grouped ? [...new Set(Object.values(options).map(o => o.category))].filter(Boolean) : [];
  
  const toggleItem = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter(s => s !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  const removeItem = (code) => {
    onChange(selected.filter(s => s !== code));
  };

  const colorClasses = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', button: 'bg-blue-100 hover:bg-blue-200 text-blue-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', button: 'bg-amber-100 hover:bg-amber-200 text-amber-700' }
  };
  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {selected.map(code => (
          <span key={code} className={`inline-flex items-center gap-1 px-2 py-1 ${colors.bg} ${colors.border} border rounded-full text-sm`}>
            <span>{options[code]?.emoji}</span>
            <span className={colors.text}>{options[code]?.name}</span>
            <button onClick={() => removeItem(code)} className="ml-1 hover:bg-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
          </span>
        ))}
        <button onClick={() => setIsOpen(!isOpen)} className={`inline-flex items-center gap-1 px-3 py-1.5 ${colors.button} rounded-full text-sm font-medium transition-colors`}>
          {icon} {selected.length === 0 ? label : '+'}
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-20 bg-white rounded-xl shadow-lg border p-3 min-w-[280px] max-w-[350px] max-h-[280px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2 pb-2 border-b">
              <span className="font-medium text-sm">{label}</span>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {grouped && categories.length > 0 ? (
              <div className="space-y-3">
                {categories.map(category => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{category}</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(options).filter(([_, opt]) => opt.category === category).map(([code, opt]) => (
                        <button key={code} onClick={() => toggleItem(code)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${selected.includes(code) ? `${colors.bg} ${colors.border} border-2 ${colors.text} font-medium` : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                          <span>{opt.emoji}</span><span>{opt.name}</span>{selected.includes(code) && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {Object.entries(options).map(([code, opt]) => (
                  <button key={code} onClick={() => toggleItem(code)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${selected.includes(code) ? `${colors.bg} ${colors.border} border-2 ${colors.text} font-medium` : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                    <span>{opt.emoji}</span><span>{opt.name}</span>{selected.includes(code) && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
            {selected.length > 0 && (
              <div className="mt-3 pt-2 border-t flex justify-between items-center">
                <span className="text-xs text-gray-500">{selected.length} selected</span>
                <button onClick={() => setIsOpen(false)} className={`px-3 py-1 ${colors.button} rounded-lg text-sm font-medium`}>Done</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// STEP EDITOR COMPONENT - Camera, Upload & AI Generation
// ============================================================================
const StepEditor = ({ step, index, sopTitle, sopDescription, onUpdate, onRemove, clientId }) => {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be less than 5MB'); return; }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `sop-step-${Date.now()}.${fileExt}`;
      const filePath = `${clientId}/sop-images/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);
      onUpdate('image_url', publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateNarrative = async () => {
    if (!step.title?.trim()) { alert('Please enter a step title first'); return; }
    setGenerating(true);
    try {
      const safetyContext = (step.safety_warnings || []).map(w => SAFETY_WARNINGS[w]?.name).filter(Boolean).join(', ');
      const ppeContext = (step.ppe_required || []).map(p => PPE_TYPES[p]?.name).filter(Boolean).join(', ');
      const prompt = `You are an expert SOP writer for manufacturing. Generate clear instructions for:\n\nSOP: ${sopTitle}\nStep ${index + 1}: ${step.title}\n${safetyContext ? `Safety: ${safetyContext}` : ''}\n${ppeContext ? `PPE: ${ppeContext}` : ''}\n\nWrite 2-4 sentences of clear, actionable instructions. Use active voice. No bullets.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], max_tokens: 300 })
      });
      if (!response.ok) throw new Error('AI generation failed');
      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || data.content || '';
      if (generatedText) onUpdate('instruction_text', generatedText.trim());
    } catch (error) {
      console.error('Error generating narrative:', error);
      alert('Failed to generate. Try again or write manually.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">{index + 1}</span>
          <input value={step.title || ''} onChange={(e) => onUpdate('title', e.target.value)} className="font-semibold text-lg bg-transparent border-none focus:outline-none placeholder-gray-400 flex-1" placeholder="Step title..." />
        </div>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
      </div>

      {/* Image */}
      <div className="mb-4">
        {step.image_url ? (
          <div className="relative inline-block">
            <img src={step.image_url} alt={`Step ${index + 1}`} className="max-h-32 rounded-lg border" />
            <button onClick={() => onUpdate('image_url', null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => cameraInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} 📷 Photo
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 📁 Upload
            </button>
          </div>
        )}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      </div>

      {/* Instructions with AI */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Instructions</label>
          <button onClick={handleGenerateNarrative} disabled={generating || !step.title?.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg text-xs font-medium hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 shadow-sm" title={!step.title?.trim() ? 'Enter title first' : 'AI generate'}>
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} {generating ? 'Writing...' : '✨ AI Write'}
          </button>
        </div>
        <textarea value={step.instruction_text || ''} onChange={(e) => onUpdate('instruction_text', e.target.value)} className="w-full px-4 py-3 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Describe what the operator should do..." />
      </div>

      {/* Smart PPE & Safety Pickers */}
      <div className="flex flex-wrap gap-3 mb-4">
        <SmartPicker label="Add PPE" icon="🧤" options={PPE_TYPES} selected={step.ppe_required || []} onChange={(val) => onUpdate('ppe_required', val)} grouped={true} color="blue" />
        <SmartPicker label="Add Warning" icon="⚠️" options={SAFETY_WARNINGS} selected={step.safety_warnings || []} onChange={(val) => onUpdate('safety_warnings', val)} grouped={false} color="amber" />
      </div>

      {/* Toggle Pills */}
      <div className="flex flex-wrap gap-2 pt-3 border-t">
        <button onClick={() => onUpdate('requires_photo', !step.requires_photo)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${step.requires_photo ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          📷 Photo required {step.requires_photo && <Check className="w-3 h-3" />}
        </button>
        <button onClick={() => onUpdate('requires_comment', !step.requires_comment)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${step.requires_comment ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          💬 Comment required {step.requires_comment && <Check className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// PART 2 - MAIN COMPONENT (paste after Part 1)
// ============================================================================

export default function SOPsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('repository');
  const [loading, setLoading] = useState(true);
  
  // Data state
  const [catalogs, setCatalogs] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [sops, setSops] = useState([]);
  const [users, setUsers] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [pendingSignoffs, setPendingSignoffs] = useState([]);
  const [myAssignedSOPs, setMyAssignedSOPs] = useState([]);
  
  // UI state
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [expandedCatalogs, setExpandedCatalogs] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  
  // Modals
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showSOPBuilder, setShowSOPBuilder] = useState(false);
  const [showSOPViewer, setShowSOPViewer] = useState(false);
  const [showSOPExecute, setShowSOPExecute] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState(null);
  const [editingCatalog, setEditingCatalog] = useState(null);
  const [editingEquipment, setEditingEquipment] = useState(null);
  
  // Stats
  const [stats, setStats] = useState({ published: 0, drafts: 0, pendingReview: 0, reviewDue: 0 });
  
  const isManager = ['super_admin', 'client_admin', 'site_admin', 'category_admin', 'team_lead'].includes(profile?.role);
  const clientId = profile?.client_id;

  // Load all data
  const loadData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [catalogsData, equipmentData, sopsData, usersData, myExecutions, assignedToMe] = await Promise.all([
        dbFetch(`sop_catalogs?client_id=eq.${clientId}&order=display_order,name`),
        dbFetch(`sop_equipment?client_id=eq.${clientId}&is_active=eq.true&order=name`),
        dbFetch(`sops?client_id=eq.${clientId}&order=sop_number`),
        dbFetch(`profiles?client_id=eq.${clientId}&is_active=eq.true&select=id,full_name,role`),
        dbFetch(`sop_executions?client_id=eq.${clientId}&executed_by=eq.${profile.id}&order=started_at.desc&limit=50`),
        dbFetch(`sops?client_id=eq.${clientId}&assigned_to=eq.${profile.id}&status=in.(draft,pending_review)&order=due_date`)
      ]);
      setCatalogs(catalogsData || []);
      setEquipment(equipmentData || []);
      setSops(sopsData || []);
      setUsers(usersData || []);
      setExecutions(myExecutions || []);
      setMyAssignedSOPs(assignedToMe || []);
      
      if (isManager) {
        const [reviews, signoffs] = await Promise.all([
          dbFetch(`sops?client_id=eq.${clientId}&status=eq.pending_review&order=submitted_at`),
          dbFetch(`sop_executions?client_id=eq.${clientId}&signoff_status=eq.pending&status=eq.completed&order=completed_at`)
        ]);
        setPendingReviews(reviews || []);
        setPendingSignoffs(signoffs || []);
      }
      
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      setStats({
        published: sopsData?.filter(s => s.status === 'published').length || 0,
        drafts: sopsData?.filter(s => s.status === 'draft').length || 0,
        pendingReview: sopsData?.filter(s => s.status === 'pending_review').length || 0,
        reviewDue: sopsData?.filter(s => s.next_review_date && new Date(s.next_review_date) <= thirtyDays).length || 0
      });
    } catch (error) {
      console.error('Error loading SOP data:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, profile?.id, isManager]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter SOPs
  const filteredSOPs = sops.filter(sop => {
    const matchesSearch = !searchTerm || sop.title?.toLowerCase().includes(searchTerm.toLowerCase()) || sop.sop_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sop.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || sop.risk_level === riskFilter;
    const matchesCatalog = !selectedCatalog || sop.catalog_id === selectedCatalog;
    return matchesSearch && matchesStatus && matchesRisk && matchesCatalog;
  });

  const toggleCatalog = (catalogId) => {
    const newExpanded = new Set(expandedCatalogs);
    if (newExpanded.has(catalogId)) newExpanded.delete(catalogId);
    else newExpanded.add(catalogId);
    setExpandedCatalogs(newExpanded);
  };

  const getUserName = (userId) => users.find(u => u.id === userId)?.full_name || 'Unknown';

  // Catalog tree renderer
  const renderCatalogTree = () => {
    const rootCatalogs = catalogs.filter(c => !c.parent_id);
    const getChildren = (parentId) => catalogs.filter(c => c.parent_id === parentId);
    const renderItem = (catalog, level = 0) => {
      const children = getChildren(catalog.id);
      const isExpanded = expandedCatalogs.has(catalog.id);
      const isSelected = selectedCatalog === catalog.id;
      const sopCount = sops.filter(s => s.catalog_id === catalog.id).length;
      return (
        <div key={catalog.id}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`} style={{ paddingLeft: `${12 + level * 16}px` }} onClick={() => { setSelectedCatalog(isSelected ? null : catalog.id); }}>
            {children.length > 0 ? <button onClick={(e) => { e.stopPropagation(); toggleCatalog(catalog.id); }} className="p-0.5">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button> : <div className="w-5" />}
            {isExpanded ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-500" />}
            <span className="flex-1 text-sm font-medium truncate">{catalog.name}</span>
            {sopCount > 0 && <span className="text-xs bg-gray-100 px-1.5 rounded">{sopCount}</span>}
          </div>
          {isExpanded && children.map(child => renderItem(child, level + 1))}
        </div>
      );
    };
    return rootCatalogs.map(c => renderItem(c));
  };

  // SOP Card Component
  const SOPCard = ({ sop }) => {
    const status = STATUS_COLORS[sop.status] || STATUS_COLORS.draft;
    const risk = RISK_COLORS[sop.risk_level] || RISK_COLORS.medium;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500">{sop.sop_number}</span>
              {sop.is_master && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 rounded">MASTER</span>}
            </div>
            <h3 className="font-semibold text-gray-900 line-clamp-2">{sop.title}</h3>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.text}`}>{status.label}</span>
        </div>
        {sop.assigned_to && (
          <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
            <User className="w-3 h-3" />
            <span>Assigned: {getUserName(sop.assigned_to)}</span>
            {sop.due_date && <span className="text-gray-500">• Due: {new Date(sop.due_date).toLocaleDateString()}</span>}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className={`px-1.5 py-0.5 rounded ${risk.bg} ${risk.text}`}>{risk.label}</span>
          {sop.has_audio && <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" /> Audio</span>}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{sop.estimated_duration_minutes || '?'} min</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">v{sop.version}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setSelectedSOP(sop); setShowSOPViewer(true); }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="View"><Eye className="w-4 h-4" /></button>
            {sop.status === 'published' && <button onClick={() => { setSelectedSOP(sop); setShowSOPExecute(true); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Execute"><Play className="w-4 h-4" /></button>}
            {isManager && <button onClick={() => { setSelectedSOP(sop); setShowSOPBuilder(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit className="w-4 h-4" /></button>}
          </div>
        </div>
      </div>
    );
  };

  // Execution Card
  const ExecutionCard = ({ execution }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{execution.sop_title || 'SOP'}</h3>
          <p className="text-sm text-gray-500">{new Date(execution.started_at).toLocaleString()}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${execution.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
          {execution.status === 'completed' ? 'Completed' : 'In Progress'}
        </span>
      </div>
      {execution.status === 'in_progress' && (
        <button onClick={() => { setSelectedSOP({ id: execution.sop_id }); setShowSOPExecute(true); }} className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Continue</button>
      )}
    </div>
  );
  // ============================================================================
  // PART 3 - MODALS (paste after Part 2, inside the component)
  // ============================================================================

  // Catalog Modal
  const CatalogModal = () => {
    const [name, setName] = useState(editingCatalog?.name || '');
    const [description, setDescription] = useState(editingCatalog?.description || '');
    const [parentId, setParentId] = useState(editingCatalog?.parent_id || '');
    const [saving, setSaving] = useState(false);
    const handleSave = async () => {
      if (!name.trim()) return;
      setSaving(true);
      try {
        const data = { name: name.trim(), description, parent_id: parentId || null, client_id: clientId };
        if (editingCatalog?.id) await dbFetch(`sop_catalogs?id=eq.${editingCatalog.id}`, { method: 'PATCH', body: JSON.stringify(data) });
        else { data.created_by = profile.id; await dbFetch('sop_catalogs', { method: 'POST', body: JSON.stringify(data) }); }
        setShowCatalogModal(false); setEditingCatalog(null); loadData();
      } catch (error) { console.error('Error saving catalog:', error); }
      finally { setSaving(false); }
    };
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingCatalog ? 'Edit Catalog' : 'New Catalog'}</h2>
            <button onClick={() => { setShowCatalogModal(false); setEditingCatalog(null); }}><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Name *</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={2} /></div>
            <div><label className="block text-sm font-medium mb-1">Parent Catalog</label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">None (Root)</option>
                {catalogs.filter(c => c.id !== editingCatalog?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => { setShowCatalogModal(false); setEditingCatalog(null); }} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving || !name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    );
  };

  // Equipment Modal
  const EquipmentModal = () => {
    const [name, setName] = useState(editingEquipment?.name || '');
    const [code, setCode] = useState(editingEquipment?.code || '');
    const [catalogId, setCatalogId] = useState(editingEquipment?.catalog_id || '');
    const [site, setSite] = useState(editingEquipment?.site || '');
    const [saving, setSaving] = useState(false);
    const handleSave = async () => {
      if (!name.trim()) return;
      setSaving(true);
      try {
        const data = { name: name.trim(), code, catalog_id: catalogId || null, site, client_id: clientId };
        if (editingEquipment?.id) await dbFetch(`sop_equipment?id=eq.${editingEquipment.id}`, { method: 'PATCH', body: JSON.stringify(data) });
        else { data.created_by = profile.id; await dbFetch('sop_equipment', { method: 'POST', body: JSON.stringify(data) }); }
        setShowEquipmentModal(false); setEditingEquipment(null); loadData();
      } catch (error) { console.error('Error saving equipment:', error); }
      finally { setSaving(false); }
    };
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingEquipment ? 'Edit Equipment' : 'New Equipment'}</h2>
            <button onClick={() => { setShowEquipmentModal(false); setEditingEquipment(null); }}><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Name *</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Code</label><input value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Catalog</label>
              <select value={catalogId} onChange={(e) => setCatalogId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select catalog</option>
                {catalogs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Site/Factory</label><input value={site} onChange={(e) => setSite(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => { setShowEquipmentModal(false); setEditingEquipment(null); }} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving || !name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    );
  };

  // SOP Builder Modal - Enhanced with Assignment & Multi-select
  const SOPBuilderModal = () => {
    const [step, setStep] = useState(1);
    const [sopData, setSopData] = useState({
      title: selectedSOP?.title || '',
      description: selectedSOP?.description || '',
      catalog_id: selectedSOP?.catalog_id || '',
      risk_level: selectedSOP?.risk_level || 'medium',
      owner_id: selectedSOP?.owner_id || profile.id,
      assigned_to: selectedSOP?.assigned_to || '',
      due_date: selectedSOP?.due_date || '',
      requires_supervisor_signoff: selectedSOP?.requires_supervisor_signoff ?? true,
      review_frequency_months: selectedSOP?.review_frequency_months || 12
    });
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState([]);
    const [steps, setSteps] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loadingSteps, setLoadingSteps] = useState(false);

    useEffect(() => {
      if (selectedSOP?.id) {
        setLoadingSteps(true);
        Promise.all([
          dbFetch(`sop_steps?sop_id=eq.${selectedSOP.id}&order=step_number`),
          dbFetch(`sop_equipment_links?sop_id=eq.${selectedSOP.id}`)
        ]).then(([stepsData, linksData]) => {
          setSteps((stepsData || []).map(s => ({
            ...s,
            safety_warnings: s.safety_icons || [],
            ppe_required: s.ppe_required || []
          })));
          setSelectedEquipmentIds((linksData || []).map(l => l.equipment_id));
        }).finally(() => setLoadingSteps(false));
      }
    }, [selectedSOP?.id]);

    const addStep = () => {
      setSteps([...steps, { id: `new-${Date.now()}`, step_number: steps.length + 1, title: '', instruction_text: '', safety_warnings: [], ppe_required: [], requires_photo: false, requires_comment: false }]);
    };

    const updateStep = (index, field, value) => {
      const newSteps = [...steps];
      newSteps[index] = { ...newSteps[index], [field]: value };
      setSteps(newSteps);
    };

    const removeStep = (index) => {
      const newSteps = steps.filter((_, i) => i !== index);
      newSteps.forEach((s, i) => s.step_number = i + 1);
      setSteps(newSteps);
    };

    const handleSave = async (publish = false) => {
      if (!sopData.title.trim()) return alert('Title is required');
      if (steps.length === 0) return alert('Add at least one step');
      setSaving(true);
      try {
        let sopId = selectedSOP?.id;
        const sopPayload = {
          ...sopData, client_id: clientId,
          assigned_to: sopData.assigned_to || null,
          due_date: sopData.due_date || null,
          assigned_by: sopData.assigned_to ? profile.id : null,
          assigned_at: sopData.assigned_to ? new Date().toISOString() : null,
          status: publish ? 'pending_review' : 'draft',
          submitted_at: publish ? new Date().toISOString() : null,
          submitted_by: publish ? profile.id : null
        };
        if (sopId) await dbFetch(`sops?id=eq.${sopId}`, { method: 'PATCH', body: JSON.stringify(sopPayload) });
        else { sopPayload.created_by = profile.id; const result = await dbFetch('sops?select=id', { method: 'POST', body: JSON.stringify(sopPayload) }); sopId = result?.[0]?.id; }
        if (!sopId) throw new Error('Failed to save SOP');

        await dbFetch(`sop_steps?sop_id=eq.${sopId}`, { method: 'DELETE' });
        for (const s of steps) {
          await dbFetch('sop_steps', { method: 'POST', body: JSON.stringify({
            sop_id: sopId, step_number: s.step_number, title: s.title, instruction_text: s.instruction_text,
            safety_icons: s.safety_warnings || [], ppe_required: s.ppe_required || [],
            requires_photo: s.requires_photo, requires_comment: s.requires_comment
          })});
        }

        await dbFetch(`sop_equipment_links?sop_id=eq.${sopId}`, { method: 'DELETE' });
        for (const eqId of selectedEquipmentIds) {
          await dbFetch('sop_equipment_links', { method: 'POST', body: JSON.stringify({ sop_id: sopId, equipment_id: eqId, linked_by: profile.id })});
        }

        // Send notification if SOP is assigned to someone (wrapped in try-catch to not affect SOP save)
        if (sopData.assigned_to && sopData.assigned_to !== selectedSOP?.assigned_to) {
          try {
            await dbFetch('notifications', {
              method: 'POST',
              body: JSON.stringify({
                user_id: sopData.assigned_to,
                type: 'sop_assigned',
                title: 'SOP Development Assigned',
                message: `${profile.full_name} has assigned you to develop SOP: "${sopData.title}"${sopData.due_date ? ` - Due: ${new Date(sopData.due_date).toLocaleDateString()}` : ''}`,
                link: '/sops',
                metadata: { sop_id: sopId, assigned_by: profile.id, due_date: sopData.due_date }
              })
            });
          } catch (notifError) {
            console.warn('Failed to send notification, but SOP saved successfully:', notifError);
          }
        }

        setShowSOPBuilder(false); setSelectedSOP(null); loadData();
      } catch (error) { console.error('Error saving SOP:', error); alert('Failed to save SOP'); }
      finally { setSaving(false); }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div><h2 className="text-lg font-semibold">{selectedSOP ? 'Edit SOP' : 'Create SOP'}</h2><p className="text-sm text-gray-500">Step {step} of 2</p></div>
            <button onClick={() => { setShowSOPBuilder(false); setSelectedSOP(null); }}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {step === 1 && (
              <div className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">Title *</label><input value={sopData.title} onChange={(e) => setSopData({...sopData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={sopData.description} onChange={(e) => setSopData({...sopData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Catalog</label><select value={sopData.catalog_id} onChange={(e) => setSopData({...sopData, catalog_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">Select</option>{catalogs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div><label className="block text-sm font-medium mb-1">Risk Level</label><select value={sopData.risk_level} onChange={(e) => setSopData({...sopData, risk_level: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="low">🟢 Low</option><option value="medium">🟡 Medium</option><option value="high">🟠 High</option><option value="critical">🔴 Critical</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">Review Frequency</label><select value={sopData.review_frequency_months} onChange={(e) => setSopData({...sopData, review_frequency_months: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg"><option value={6}>6 months</option><option value={12}>12 months</option><option value={24}>24 months</option></select></div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Assignment</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Owner</label><select value={sopData.owner_id} onChange={(e) => setSopData({...sopData, owner_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white">{users.filter(u => u.role !== 'trainee').map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium mb-1">Assign To</label><select value={sopData.assigned_to} onChange={(e) => setSopData({...sopData, assigned_to: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white"><option value="">Not assigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.full_name} {u.role === 'trainee' ? '(Trainee)' : ''}</option>)}</select></div>
                    <div><label className="block text-sm font-medium mb-1">Due Date</label><input type="date" value={sopData.due_date} onChange={(e) => setSopData({...sopData, due_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white" /></div>
                  </div>
                </div>
                <EquipmentMultiSelect equipment={equipment} selected={selectedEquipmentIds} onChange={setSelectedEquipmentIds} />
                <label className="flex items-center gap-2"><input type="checkbox" checked={sopData.requires_supervisor_signoff} onChange={(e) => setSopData({...sopData, requires_supervisor_signoff: e.target.checked})} className="rounded" /><span className="text-sm">Requires supervisor sign-off</span></label>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-semibold">SOP Steps ({steps.length})</h3><button onClick={addStep} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1"><PlusCircle className="w-4 h-4" /> Add Step</button></div>
                {loadingSteps ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> : steps.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg"><p className="text-gray-500 mb-2">No steps yet</p><button onClick={addStep} className="text-blue-600 text-sm">Add first step</button></div>
                ) : (
                  <div className="space-y-4">
                    {steps.map((s, idx) => (
                      <StepEditor 
                        key={s.id || idx}
                        step={s}
                        index={idx}
                        sopTitle={sopData.title}
                        sopDescription={sopData.description}
                        onUpdate={(field, value) => updateStep(idx, field, value)}
                        onRemove={() => removeStep(idx)}
                        clientId={clientId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between p-4 border-t">
            <button onClick={() => step > 1 ? setStep(1) : (setShowSOPBuilder(false), setSelectedSOP(null))} className="px-4 py-2 border rounded-lg flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> {step === 1 ? 'Cancel' : 'Back'}</button>
            <div className="flex gap-2">
              {step === 2 && <><button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2 border rounded-lg"><Save className="w-4 h-4 inline mr-1" />Save Draft</button><button onClick={() => handleSave(true)} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg"><Send className="w-4 h-4 inline mr-1" />Submit</button></>}
              {step === 1 && <button onClick={() => setStep(2)} disabled={!sopData.title.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Next <ChevronRight className="w-4 h-4 inline" /></button>}
            </div>
          </div>
        </div>
      </div>
    );
  };
  // ============================================================================
  // PART 4 - VIEWER, EXECUTE, AND MAIN RENDER (paste after Part 3)
  // ============================================================================

  // SOP Viewer Modal
  const SOPViewerModal = () => {
    const [sopSteps, setSopSteps] = useState([]);
    const [equipmentLinks, setEquipmentLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      if (selectedSOP?.id) {
        setLoading(true);
        Promise.all([
          dbFetch(`sop_steps?sop_id=eq.${selectedSOP.id}&order=step_number`),
          dbFetch(`sop_equipment_links?sop_id=eq.${selectedSOP.id}&select=equipment_id,sop_equipment(name,code)`)
        ]).then(([stepsData, linksData]) => { setSopSteps(stepsData || []); setEquipmentLinks(linksData || []); }).finally(() => setLoading(false));
      }
    }, [selectedSOP?.id]);
    const status = STATUS_COLORS[selectedSOP?.status] || STATUS_COLORS.draft;
    const risk = RISK_COLORS[selectedSOP?.risk_level] || RISK_COLORS.medium;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <div className="flex items-center gap-2 mb-1"><span className="text-sm font-mono text-gray-500">{selectedSOP?.sop_number}</span><span className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.text}`}>{status.label}</span><span className={`text-xs px-2 py-0.5 rounded ${risk.bg} ${risk.text}`}>{risk.label}</span></div>
              <h2 className="text-lg font-semibold">{selectedSOP?.title}</h2>
            </div>
            <button onClick={() => { setShowSOPViewer(false); setSelectedSOP(null); }}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedSOP?.description && <p className="text-gray-600 mb-4">{selectedSOP.description}</p>}
            {equipmentLinks.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-2">Equipment:</p>
                <div className="flex flex-wrap gap-2">{equipmentLinks.map(l => <span key={l.equipment_id} className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded text-sm"><Building2 className="w-3 h-3" />{l.sop_equipment?.name}</span>)}</div>
              </div>
            )}
            {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
              <div className="space-y-4">
                {sopSteps.map((s, idx) => (
                  <div key={s.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">{idx + 1}</div>
                      <div className="flex-1">
                        {s.title && <h4 className="font-medium mb-1">{s.title}</h4>}
                        <p className="text-gray-700">{s.instruction_text}</p>
                        {(s.safety_icons?.length > 0) && <div className="flex flex-wrap gap-1 mt-2">{s.safety_icons.map(code => SAFETY_WARNINGS[code] && <span key={code} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${SAFETY_WARNINGS[code].color}`}>{SAFETY_WARNINGS[code].emoji} {SAFETY_WARNINGS[code].name}</span>)}</div>}
                        {(s.ppe_required?.length > 0) && <div className="flex flex-wrap gap-1 mt-2">{s.ppe_required.map(code => PPE_TYPES[code] && <span key={code} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200">{PPE_TYPES[code].emoji} {PPE_TYPES[code].name}</span>)}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-sm text-gray-500">v{selectedSOP?.version || 1}</span>
            <div className="flex gap-2">
              {selectedSOP?.status === 'published' && <button onClick={() => { setShowSOPViewer(false); setShowSOPExecute(true); }} className="px-4 py-2 bg-green-600 text-white rounded-lg"><Play className="w-4 h-4 inline mr-1" />Execute</button>}
              {isManager && selectedSOP?.status === 'pending_review' && <button onClick={async () => { await dbFetch(`sops?id=eq.${selectedSOP.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'published', approved_by: profile.id, approved_at: new Date().toISOString() }) }); setShowSOPViewer(false); setSelectedSOP(null); loadData(); }} className="px-4 py-2 bg-green-600 text-white rounded-lg"><Check className="w-4 h-4 inline mr-1" />Approve</button>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // SOP Execute Modal
  const SOPExecuteModal = () => {
    const [sopSteps, setSopSteps] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [executionId, setExecutionId] = useState(null);
    const [stepData, setStepData] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
      const init = async () => {
        if (!selectedSOP?.id) return;
        setLoading(true);
        try {
          const steps = await dbFetch(`sop_steps?sop_id=eq.${selectedSOP.id}&order=step_number`);
          setSopSteps(steps || []);
          let sopDetails = selectedSOP;
          if (!selectedSOP.title) { const sops = await dbFetch(`sops?id=eq.${selectedSOP.id}`); sopDetails = sops?.[0] || selectedSOP; }
          const exec = await dbFetch('sop_executions?select=id', { method: 'POST', body: JSON.stringify({ sop_id: selectedSOP.id, sop_version: sopDetails.version || 1, sop_title: sopDetails.title, executed_by: profile.id, client_id: clientId, requires_signoff: sopDetails.requires_supervisor_signoff ?? true }) });
          setExecutionId(exec?.[0]?.id);
        } catch (error) { console.error('Error:', error); }
        finally { setLoading(false); }
      };
      init();
    }, [selectedSOP?.id]);

    const completeStep = async () => {
      const step = sopSteps[currentStep];
      if (!step) return;
      if (executionId) await dbFetch('sop_execution_steps', { method: 'POST', body: JSON.stringify({ execution_id: executionId, step_id: step.id, step_number: step.step_number, comments: stepData.comments || '', status: 'completed', completed_at: new Date().toISOString() }) });
      if (currentStep < sopSteps.length - 1) { setCurrentStep(currentStep + 1); setStepData({}); }
      else {
        setSubmitting(true);
        try { await dbFetch(`sop_executions?id=eq.${executionId}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }) }); setShowSOPExecute(false); setSelectedSOP(null); loadData(); }
        catch (error) { console.error('Error:', error); }
        finally { setSubmitting(false); }
      }
    };

    const s = sopSteps[currentStep];
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div><h2 className="text-lg font-semibold">Execute SOP</h2><p className="text-sm text-gray-500">Step {currentStep + 1} of {sopSteps.length}</p></div>
            <button onClick={() => { setShowSOPExecute(false); setSelectedSOP(null); }}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> : s ? (
              <div className="space-y-4">
                {s.title && <h3 className="text-xl font-semibold">{s.title}</h3>}
                <p className="text-gray-700 text-lg">{s.instruction_text}</p>
                {(s.safety_icons?.length > 0) && <div className="flex flex-wrap gap-2">{s.safety_icons.map(code => SAFETY_WARNINGS[code] && <div key={code} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${SAFETY_WARNINGS[code].color}`}><span className="text-xl">{SAFETY_WARNINGS[code].emoji}</span>{SAFETY_WARNINGS[code].name}</div>)}</div>}
                {(s.ppe_required?.length > 0) && <div className="p-3 bg-blue-50 rounded-lg"><p className="text-sm font-medium text-blue-900 mb-2">🧤 PPE Required:</p><div className="flex flex-wrap gap-2">{s.ppe_required.map(code => PPE_TYPES[code] && <span key={code} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-sm">{PPE_TYPES[code].emoji} {PPE_TYPES[code].name}</span>)}</div></div>}
                {s.requires_comment && <div><label className="block text-sm font-medium mb-1">Comments *</label><textarea value={stepData.comments || ''} onChange={(e) => setStepData({...stepData, comments: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={3} /></div>}
                {s.requires_photo && <div className="border-2 border-dashed rounded-lg p-6 text-center"><Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-500">Photo required</p><button className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Take Photo</button></div>}
              </div>
            ) : <p className="text-center text-gray-500">No steps</p>}
          </div>
          <div className="px-6 pb-2"><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${((currentStep + 1) / sopSteps.length) * 100}%` }} /></div></div>
          <div className="flex items-center justify-between p-4 border-t">
            <button onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)} disabled={currentStep === 0} className="px-4 py-2 border rounded-lg disabled:opacity-50"><ChevronLeft className="w-4 h-4 inline" /> Previous</button>
            <button onClick={completeStep} disabled={submitting || (s?.requires_comment && !stepData.comments)} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
              {currentStep < sopSteps.length - 1 ? <>Next <ChevronRight className="w-4 h-4 inline" /></> : <>{submitting ? 'Completing...' : 'Complete'} <Check className="w-4 h-4 inline" /></>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && sops.length === 0) return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  // Main render
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ClipboardCheck className="w-7 h-7 text-blue-600" />Standard Operating Procedures</h1><p className="text-gray-600">Create, manage, and execute SOPs</p></div>
        {isManager && (
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditingCatalog(null); setShowCatalogModal(true); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"><Folder className="w-4 h-4" /> New Catalog</button>
            <button onClick={() => { setEditingEquipment(null); setShowEquipmentModal(true); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"><Building2 className="w-4 h-4" /> New Equipment</button>
            <button onClick={() => { setSelectedSOP(null); setShowSOPBuilder(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Plus className="w-4 h-4" /> Create SOP</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3"><div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold">{stats.published}</p><p className="text-sm text-gray-500">Published</p></div></div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3"><div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-gray-600" /></div><div><p className="text-2xl font-bold">{stats.drafts}</p><p className="text-sm text-gray-500">Drafts</p></div></div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3"><div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{stats.pendingReview}</p><p className="text-sm text-gray-500">Pending Review</p></div></div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3"><div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div><div><p className="text-2xl font-bold">{stats.reviewDue}</p><p className="text-sm text-gray-500">Review Due</p></div></div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'repository', label: '📚 Repository' }, 
          { key: 'my_assignments', label: '📋 My Assignments', badge: myAssignedSOPs.length },
          { key: 'executions', label: '▶️ My Executions' }, 
          ...(isManager ? [
            { key: 'pending_review', label: '⏳ Pending Review', badge: pendingReviews.length }, 
            { key: 'pending_signoff', label: '✍️ Sign-off', badge: pendingSignoffs.length }
          ] : [])
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === tab.key ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}>
            {tab.label}{tab.badge > 0 && <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* Repository Tab */}
      {activeTab === 'repository' && (
        <div className="flex gap-6">
          <div className="w-72 flex-shrink-0 space-y-4">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 border-b"><h3 className="font-semibold">Catalogs</h3></div>
              <div className="p-2 max-h-[400px] overflow-y-auto">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${!selectedCatalog ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`} onClick={() => setSelectedCatalog(null)}><Folder className="w-4 h-4" /><span className="text-sm font-medium">All SOPs</span><span className="ml-auto text-xs">{sops.length}</span></div>
                <div className="border-t my-2" />{renderCatalogTree()}
              </div>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 border-b"><h3 className="font-semibold">Equipment</h3></div>
              <div className="p-2 max-h-[300px] overflow-y-auto">
                {equipment.map(eq => <div key={eq.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${selectedEquipment === eq.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`} onClick={() => setSelectedEquipment(selectedEquipment === eq.id ? null : eq.id)}><Building2 className="w-4 h-4 text-gray-400" /><span className="text-sm truncate">{eq.name}</span></div>)}
                {equipment.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No equipment</p>}
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative"><Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search SOPs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" /></div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">All Status</option>{Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">All Risk</option>{Object.entries(RISK_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
              <button onClick={loadData} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw className="w-5 h-5" /></button>
            </div>
            {filteredSOPs.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredSOPs.map(sop => <SOPCard key={sop.id} sop={sop} />)}</div> : <div className="bg-white rounded-xl border p-12 text-center"><FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No SOPs Found</h3><p className="text-gray-500">{searchTerm || selectedCatalog ? 'Try adjusting filters' : 'Create your first SOP'}</p></div>}
          </div>
        </div>
      )}

      {/* My Assignments Tab */}
      {activeTab === 'my_assignments' && (
        myAssignedSOPs.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800">📋 You have <strong>{myAssignedSOPs.length}</strong> SOP{myAssignedSOPs.length > 1 ? 's' : ''} assigned to you for development.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAssignedSOPs.map(sop => {
                const status = STATUS_COLORS[sop.status] || STATUS_COLORS.draft;
                const risk = RISK_COLORS[sop.risk_level] || RISK_COLORS.medium;
                const isOverdue = sop.due_date && new Date(sop.due_date) < new Date();
                const assignedBy = users.find(u => u.id === sop.assigned_by);
                const owner = users.find(u => u.id === sop.owner_id);
                return (
                  <div key={sop.id} className={`bg-white border rounded-lg p-4 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <span className="text-xs font-mono text-gray-500">{sop.sop_number || 'NEW'}</span>
                        <h3 className="font-semibold text-gray-900">{sop.title}</h3>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.text}`}>{status.label}</span>
                    </div>
                    
                    {sop.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{sop.description}</p>}
                    
                    <div className="space-y-2 text-sm">
                      {sop.due_date && (
                        <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          <Clock className="w-4 h-4" />
                          <span>Due: {new Date(sop.due_date).toLocaleDateString()}</span>
                          {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">OVERDUE</span>}
                        </div>
                      )}
                      {assignedBy && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4" />
                          <span>Assigned by: {assignedBy.full_name}</span>
                        </div>
                      )}
                      {owner && owner.id !== sop.assigned_by && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>Approver: {owner.full_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${risk.bg} ${risk.text}`}>{risk.label} Risk</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <button onClick={() => { setSelectedSOP(sop); setShowSOPViewer(true); }} className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center justify-center gap-1">
                        <Eye className="w-4 h-4" /> View
                      </button>
                      <button onClick={() => { setSelectedSOP(sop); setShowSOPBuilder(true); }} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-1">
                        <Edit className="w-4 h-4" /> Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No SOPs Assigned</h3>
            <p className="text-gray-500">You don't have any SOPs assigned for development.</p>
          </div>
        )
      )}

      {/* Executions Tab */}
      {activeTab === 'executions' && (executions.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{executions.map(ex => <ExecutionCard key={ex.id} execution={ex} />)}</div> : <div className="bg-white rounded-xl border p-12 text-center"><Play className="w-12 h-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No Executions Yet</h3></div>)}

      {/* Pending Review Tab */}
      {activeTab === 'pending_review' && isManager && (pendingReviews.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{pendingReviews.map(sop => <div key={sop.id} className="bg-white border rounded-lg p-4"><span className="text-xs font-mono text-gray-500">{sop.sop_number}</span><h3 className="font-semibold">{sop.title}</h3><div className="flex gap-2 mt-3"><button onClick={() => { setSelectedSOP(sop); setShowSOPViewer(true); }} className="flex-1 py-2 border rounded-lg text-sm">Review</button><button onClick={async () => { await dbFetch(`sops?id=eq.${sop.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'published', approved_by: profile.id, approved_at: new Date().toISOString() }) }); loadData(); }} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm">Approve</button></div></div>)}</div> : <div className="bg-white rounded-xl border p-12 text-center"><CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No Pending Reviews</h3></div>)}

      {/* Pending Signoff Tab */}
      {activeTab === 'pending_signoff' && isManager && (pendingSignoffs.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{pendingSignoffs.map(ex => <div key={ex.id} className="bg-white border rounded-lg p-4"><h3 className="font-semibold mb-1">{ex.sop_title}</h3><p className="text-sm text-gray-500 mb-3">{new Date(ex.completed_at).toLocaleString()}</p><button onClick={async () => { await dbFetch(`sop_executions?id=eq.${ex.id}`, { method: 'PATCH', body: JSON.stringify({ signoff_status: 'approved', supervisor_id: profile.id, signed_off_at: new Date().toISOString() }) }); loadData(); }} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm">Sign Off</button></div>)}</div> : <div className="bg-white rounded-xl border p-12 text-center"><CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No Pending Sign-offs</h3></div>)}

      {/* Modals */}
      {showCatalogModal && <CatalogModal />}
      {showEquipmentModal && <EquipmentModal />}
      {showSOPBuilder && <SOPBuilderModal />}
      {showSOPViewer && selectedSOP && <SOPViewerModal />}
      {showSOPExecute && selectedSOP && <SOPExecuteModal />}
    </div>
  );
}
