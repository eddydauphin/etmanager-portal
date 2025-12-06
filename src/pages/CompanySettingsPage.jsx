import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { dbFetch } from '../lib/db';
import {
  Building2,
  Upload,
  Palette,
  Type,
  Save,
  Check,
  AlertCircle,
  Eye,
  Image,
  X,
  Loader2
} from 'lucide-react';

export default function CompanySettingsPage() {
  const { profile: currentProfile } = useAuth();
  
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    logo_url: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    accent_color: '#10B981',
    font_family: 'Inter'
  });

  const fontOptions = [
    { value: 'Inter', label: 'Inter (Modern)' },
    { value: 'Roboto', label: 'Roboto (Clean)' },
    { value: 'Open Sans', label: 'Open Sans (Friendly)' },
    { value: 'Lato', label: 'Lato (Professional)' },
    { value: 'Montserrat', label: 'Montserrat (Bold)' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro (Technical)' },
    { value: 'Poppins', label: 'Poppins (Contemporary)' },
    { value: 'Nunito', label: 'Nunito (Rounded)' }
  ];

  const colorPresets = [
    { name: 'Blue', primary: '#3B82F6', secondary: '#1E40AF', accent: '#10B981' },
    { name: 'Green', primary: '#10B981', secondary: '#047857', accent: '#3B82F6' },
    { name: 'Purple', primary: '#8B5CF6', secondary: '#6D28D9', accent: '#EC4899' },
    { name: 'Red', primary: '#EF4444', secondary: '#B91C1C', accent: '#F59E0B' },
    { name: 'Orange', primary: '#F97316', secondary: '#C2410C', accent: '#3B82F6' },
    { name: 'Teal', primary: '#14B8A6', secondary: '#0F766E', accent: '#8B5CF6' },
    { name: 'Indigo', primary: '#6366F1', secondary: '#4338CA', accent: '#10B981' },
    { name: 'Gray', primary: '#6B7280', secondary: '#374151', accent: '#3B82F6' }
  ];

  useEffect(() => {
    loadClientData();
  }, [currentProfile]);

  const loadClientData = async () => {
    if (!currentProfile?.client_id) {
      setLoading(false);
      return;
    }

    try {
      const data = await dbFetch(`clients?id=eq.${currentProfile.client_id}&select=*`);
      if (data && data.length > 0) {
        const clientData = data[0];
        setClient(clientData);
        setFormData({
          logo_url: clientData.logo_url || '',
          primary_color: clientData.primary_color || '#3B82F6',
          secondary_color: clientData.secondary_color || '#1E40AF',
          accent_color: clientData.accent_color || '#10B981',
          font_family: clientData.font_family || 'Inter'
        });
      }
    } catch (error) {
      console.error('Error loading client:', error);
      setMessage({ type: 'error', text: 'Failed to load company settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Logo must be less than 2MB' });
      return;
    }

    setUploadingLogo(true);
    setMessage({ type: '', text: '' });

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentProfile.client_id}_logo_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('client-logos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('client-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      setMessage({ type: 'success', text: 'Logo uploaded successfully' });
    } catch (error) {
      console.error('Error uploading logo:', error);
      setMessage({ type: 'error', text: 'Failed to upload logo. Make sure storage bucket exists.' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }));
  };

  const handleSave = async () => {
    if (!client?.id) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await dbFetch(`clients?id=eq.${client.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          logo_url: formData.logo_url || null,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          accent_color: formData.accent_color,
          font_family: formData.font_family
        })
      });

      setMessage({ type: 'success', text: 'Branding settings saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No company associated with your account</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-gray-600">Customize your training portal branding</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Company Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Company</h2>
            </div>
            <p className="text-xl font-medium text-gray-900">{client.name}</p>
          </div>

          {/* Logo Upload */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Image className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Company Logo</h2>
            </div>

            <div className="space-y-4">
              {formData.logo_url ? (
                <div className="relative inline-block">
                  <img
                    src={formData.logo_url}
                    alt="Company Logo"
                    className="max-h-24 max-w-48 object-contain rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No logo uploaded</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => document.getElementById('logo-upload').click()}
                  disabled={uploadingLogo}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingLogo ? 'Uploading...' : formData.logo_url ? 'Change Logo' : 'Upload Logo'}
                </button>
                <span className="text-sm text-gray-500">PNG, JPG, SVG (max 2MB)</span>
              </div>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Color Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Palette className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Brand Colors</h2>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <div className="flex">
                      <div className="w-4 h-4 rounded-l" style={{ backgroundColor: preset.primary }} />
                      <div className="w-4 h-4 rounded-r" style={{ backgroundColor: preset.secondary }} />
                    </div>
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Accent</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={formData.accent_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Font Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Type className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Typography</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
              <select
                value={formData.font_family}
                onChange={(e) => setFormData(prev => ({ ...prev, font_family: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {fontOptions.map((font) => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
            </div>

            <div 
              className="border border-gray-200 rounded-lg overflow-hidden"
              style={{ fontFamily: formData.font_family }}
            >
              {/* Preview Header */}
              <div 
                className="p-4 text-white"
                style={{ backgroundColor: formData.primary_color }}
              >
                <div className="flex items-center gap-3">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" className="h-8 object-contain" />
                  ) : (
                    <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                  )}
                  <span className="font-semibold">{client.name} Training Portal</span>
                </div>
              </div>

              {/* Preview Content */}
              <div className="p-4 space-y-4">
                <div>
                  <h3 
                    className="text-lg font-semibold mb-2"
                    style={{ color: formData.secondary_color }}
                  >
                    Safety Procedures Training
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Learn essential workplace safety procedures in this comprehensive module.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 text-white rounded-lg text-sm font-medium"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    Start Training
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium border"
                    style={{ 
                      borderColor: formData.secondary_color,
                      color: formData.secondary_color
                    }}
                  >
                    View Details
                  </button>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span style={{ color: formData.accent_color }}>75%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: '75%',
                        backgroundColor: formData.accent_color 
                      }}
                    />
                  </div>
                </div>

                {/* Badge */}
                <div className="flex items-center gap-2">
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: formData.accent_color }}
                  >
                    Completed
                  </span>
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: formData.primary_color + '20',
                      color: formData.primary_color
                    }}
                  >
                    In Progress
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              This is how your training portal will look to trainees
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}