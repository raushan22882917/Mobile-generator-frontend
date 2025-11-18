'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface SupabaseConfigDialogProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SupabaseConfigDialog({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: SupabaseConfigDialogProps) {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectionTested, setConnectionTested] = useState(false);

  // Load existing config when dialog opens
  useEffect(() => {
    if (isOpen && projectId) {
      loadConfig();
    } else {
      // Reset form when dialog closes
      setSupabaseUrl('');
      setSupabaseKey('');
      setError(null);
      setSuccess(null);
      setConnectionTested(false);
    }
  }, [isOpen, projectId]);

  const loadConfig = async () => {
    try {
      const status = await apiClient.getSupabaseConfigStatus(projectId);
      // Note: API doesn't return actual values for security
      // Fields will remain empty for user to enter/update
    } catch (err) {
      console.error('Failed to load config status:', err);
    }
  };

  const validateInputs = (): boolean => {
    if (!supabaseUrl || !supabaseKey) {
      setError('Please fill in both Supabase URL and Anon Key');
      return false;
    }

    // Basic URL validation
    try {
      new URL(supabaseUrl);
    } catch {
      setError('Please enter a valid Supabase URL (e.g., https://xxxxx.supabase.co)');
      return false;
    }

    // Basic JWT validation (should start with eyJ)
    if (!supabaseKey.startsWith('eyJ')) {
      setError('Invalid Anon Key format. It should be a JWT token starting with "eyJ"');
      return false;
    }

    return true;
  };

  const handleTestConnection = async () => {
    if (!validateInputs()) {
      return;
    }

    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiClient.testSupabaseConnection(projectId, {
        supabase_url: supabaseUrl,
        supabase_anon_key: supabaseKey,
      });

      if (result.success) {
        setSuccess(`Connection successful! ${result.project_name ? `Connected to: ${result.project_name}` : ''}`);
        setConnectionTested(true);
        setError(null);
      } else {
        setError(result.message || 'Connection failed. Please check your credentials.');
        setConnectionTested(false);
        setSuccess(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to test connection. Please try again.');
      setConnectionTested(false);
      setSuccess(null);
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!validateInputs()) {
      return;
    }

    // If connection not tested, test it first
    if (!connectionTested) {
      await handleTestConnection();
      if (!connectionTested) {
        return; // Don't proceed if test failed
      }
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.updateSupabaseConfig(projectId, {
        supabase_url: supabaseUrl,
        supabase_anon_key: supabaseKey,
      });

      setSuccess('Successfully connected! Supabase configuration saved.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Connect Supabase</h2>
              <p className="text-sm text-blue-100">Configure authentication for your project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">What is Supabase?</h3>
                <p className="text-sm text-blue-800">
                  Supabase provides authentication, database, and real-time features. Enter your project credentials below to enable user authentication in your app.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800 flex-1">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-green-800 flex-1">{success}</p>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="supabase-url" className="block text-sm font-medium text-gray-700 mb-2">
                Supabase Project URL <span className="text-red-500">*</span>
              </label>
              <input
                id="supabase-url"
                type="url"
                value={supabaseUrl}
                onChange={(e) => {
                  setSupabaseUrl(e.target.value);
                  setConnectionTested(false);
                  setError(null);
                  setSuccess(null);
                }}
                placeholder="https://xxxxx.supabase.co"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">Your Supabase project URL from the dashboard</p>
            </div>

            <div>
              <label htmlFor="supabase-key" className="block text-sm font-medium text-gray-700 mb-2">
                Supabase Anon Key <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="supabase-key"
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => {
                    setSupabaseKey(e.target.value);
                    setConnectionTested(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('supabase-key') as HTMLInputElement;
                    if (input) {
                      input.type = input.type === 'password' ? 'text' : 'password';
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Your Supabase anonymous/public key (safe to use in client-side code)</p>
            </div>

            {/* Help Link */}
            <div className="pt-2">
              <a
                href="https://app.supabase.com/project/_/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Don't have credentials? Get them from Supabase Dashboard
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading || testing}
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleTestConnection}
              disabled={loading || testing || !supabaseUrl || !supabaseKey}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Connection
                </>
              )}
            </button>
            <button
              onClick={handleConnect}
              disabled={loading || testing || !supabaseUrl || !supabaseKey}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Connect & Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

