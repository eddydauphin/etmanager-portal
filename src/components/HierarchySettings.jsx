// ============================================================================
// HIERARCHY SETTINGS COMPONENT
// Allows Client Admins to configure which organizational levels are enabled
// ============================================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  Crown,
  Building2,
  MapPin,
  Users,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  Pencil
} from 'lucide-react';

// Default hierarchy settings
const DEFAULT_HIERARCHY = {
  use_category_admin: false,
  use_site_admin: false,
  use_team_lead: true,
  category_admin_label: 'Category Admin',
  site_admin_label: 'Site Admin',
  team_lead_label: 'Team Lead',
  trainee_label: 'Trainee'
};

// Role hierarchy order (top to bottom)
const ROLE_HIERARCHY = [
  { key: 'client_admin', label: 'Client Admin', icon: Crown, color: 'purple', alwaysEnabled: true },
  { key: 'category_admin', label: 'Category Admin', icon: Building2, color: 'indigo', settingKey: 'use_category_admin' },
  { key: 'site_admin', label: 'Site Admin', icon: MapPin, color: 'blue', settingKey: 'use_site_admin' },
  { key: 'team_lead', label: 'Team Lead', icon: Users, color: 'cyan', settingKey: 'use_team_lead' },
  { key: 'trainee', label: 'Trainee', icon: UserCheck, color: 'emerald', alwaysEnabled: true }
];

export default function HierarchySettings({ clientId, onUpdate }) {
  const { profile } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_HIERARCHY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editingLabel, setEditingLabel] = useState(null);

  useEffect(() => {
    if (clientId) {
      loadSettings();
    }
  }, [clientId]);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await dbFetch(`clients?select=hierarchy_settings&id=eq.${clientId}`);
      if (data && data[0]?.hierarchy_settings) {
        setSettings({ ...DEFAULT_HIERARCHY, ...data[0].hierarchy_settings });
      }
    } catch (err) {
      console.error('Error loading hierarchy settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await dbFetch(`clients?id=eq.${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          hierarchy_settings: settings,
          updated_at: new Date().toISOString()
        })
      });

      setSuccess('Hierarchy settings saved successfully!');
      if (onUpdate) onUpdate(settings);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving hierarchy settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function toggleLevel(settingKey) {
    setSettings(prev => ({
      ...prev,
      [settingKey]: !prev[settingKey]
    }));
  }

  function updateLabel(labelKey, value) {
    setSettings(prev => ({
      ...prev,
      [labelKey]: value
    }));
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading hierarchy settings...</span>
        </div>
      </div>
    );
  }

  // Calculate which levels are active for the preview
  const activeLevels = ROLE_HIERARCHY.filter(role => 
    role.alwaysEnabled || settings[role.settingKey]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Organization Hierarchy
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure which management levels your organization uses
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Customize your organization structure</p>
          <p className="mt-1">
            Enable or disable intermediate management levels based on your organization's needs. 
            Disabled levels won't appear when creating users.
          </p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700">{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Toggles */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
            Management Levels
          </h3>
          
          {ROLE_HIERARCHY.map((role, index) => {
            const Icon = role.icon;
            const isEnabled = role.alwaysEnabled || settings[role.settingKey];
            const labelKey = `${role.key}_label`;
            const currentLabel = settings[labelKey] || role.label;
            const isEditing = editingLabel === role.key;

            return (
              <div 
                key={role.key}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  isEnabled 
                    ? `border-${role.color}-200 bg-${role.color}-50` 
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
                style={{
                  borderColor: isEnabled ? `var(--${role.color}-200, #e0e7ff)` : undefined,
                  backgroundColor: isEnabled ? `var(--${role.color}-50, #eef2ff)` : undefined
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isEnabled ? `bg-${role.color}-100 text-${role.color}-600` : 'bg-gray-200 text-gray-400'
                  }`}
                  style={{
                    backgroundColor: isEnabled ? `var(--${role.color}-100, #c7d2fe)` : undefined,
                    color: isEnabled ? `var(--${role.color}-600, #4f46e5)` : undefined
                  }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    {isEditing && !role.alwaysEnabled ? (
                      <input
                        type="text"
                        value={currentLabel}
                        onChange={(e) => updateLabel(labelKey, e.target.value)}
                        onBlur={() => setEditingLabel(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingLabel(null)}
                        autoFocus
                        className="font-medium text-gray-900 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{currentLabel}</span>
                        {!role.alwaysEnabled && isEnabled && (
                          <button
                            onClick={() => setEditingLabel(role.key)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Edit label"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {role.alwaysEnabled ? 'Always enabled' : 'Click toggle to enable/disable'}
                    </p>
                  </div>
                </div>

                {!role.alwaysEnabled && (
                  <button
                    onClick={() => toggleLevel(role.settingKey)}
                    className="flex-shrink-0"
                  >
                    {isEnabled ? (
                      <ToggleRight className="w-10 h-10 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
            Hierarchy Preview
          </h3>
          
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col items-center space-y-2">
              {activeLevels.map((role, index) => {
                const Icon = role.icon;
                const labelKey = `${role.key}_label`;
                const label = settings[labelKey] || role.label;
                const colorClasses = {
                  purple: 'bg-purple-100 text-purple-700 border-purple-300',
                  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
                  blue: 'bg-blue-100 text-blue-700 border-blue-300',
                  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-300',
                  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300'
                };

                return (
                  <div key={role.key} className="flex flex-col items-center">
                    {index > 0 && (
                      <div className="flex flex-col items-center my-1">
                        <div className="w-0.5 h-3 bg-gray-300"></div>
                        <ChevronDown className="w-4 h-4 text-gray-400 -my-1" />
                      </div>
                    )}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colorClasses[role.color]}`}>
                      <Icon className="w-4 h-4" />
                      <span className="font-medium text-sm">{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Levels Summary */}
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{activeLevels.length}</span> management levels active
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {activeLevels.map(r => settings[`${r.key}_label`] || r.label).join(' → ')}
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Hierarchy Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Export helper to get hierarchy settings
export async function getHierarchySettings(clientId) {
  try {
    const data = await dbFetch(`clients?select=hierarchy_settings&id=eq.${clientId}`);
    return data?.[0]?.hierarchy_settings || DEFAULT_HIERARCHY;
  } catch (err) {
    console.error('Error fetching hierarchy settings:', err);
    return DEFAULT_HIERARCHY;
  }
}

// Export helper to check if a role is enabled for an organization
export function isRoleEnabled(hierarchySettings, role) {
  if (!hierarchySettings) return true;
  
  switch (role) {
    case 'client_admin':
    case 'trainee':
      return true; // Always enabled
    case 'category_admin':
      return hierarchySettings.use_category_admin === true;
    case 'site_admin':
      return hierarchySettings.use_site_admin === true;
    case 'team_lead':
      return hierarchySettings.use_team_lead !== false; // Default true
    default:
      return true;
  }
}

// Export helper to get role label
export function getRoleLabel(hierarchySettings, role) {
  if (!hierarchySettings) return role.replace('_', ' ');
  
  const labelKey = `${role}_label`;
  return hierarchySettings[labelKey] || role.replace('_', ' ');
}

// Export the default hierarchy
export { DEFAULT_HIERARCHY, ROLE_HIERARCHY };
