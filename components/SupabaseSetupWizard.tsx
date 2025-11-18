'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import SupabaseConfigModal from './SupabaseConfigModal';

interface SupabaseSetupWizardProps {
  projectId: string;
  onComplete: () => void;
  onSkip: () => void;
}

type WizardStep = 'intro' | 'credentials' | 'test' | 'complete';

export default function SupabaseSetupWizard({
  projectId,
  onComplete,
  onSkip,
}: SupabaseSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('intro');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setTestResult({ success: false, message: 'Please fill in both fields' });
      return;
    }

    // Basic URL validation
    try {
      new URL(supabaseUrl);
    } catch {
      setTestResult({ success: false, message: 'Please enter a valid URL' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await apiClient.testSupabaseConnection(projectId, {
        supabase_url: supabaseUrl,
        supabase_anon_key: supabaseKey,
      });

      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Connection successful! Ready to save.' : 'Connection failed'),
      });

      if (result.success) {
        // Auto-save configuration and advance to complete step
        try {
          await apiClient.updateSupabaseConfig(projectId, {
            supabase_url: supabaseUrl,
            supabase_anon_key: supabaseKey,
          });
          // Auto-advance to next step after saving
          setTimeout(() => {
            setCurrentStep('complete');
          }, 1500);
        } catch (saveErr: any) {
          setTestResult({
            success: false,
            message: saveErr.message || 'Connection successful but failed to save configuration',
          });
        }
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to test connection',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndComplete = async () => {
    // Configuration is already saved in handleTestConnection if test was successful
    // This function just closes the wizard
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'intro':
        return (
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Supabase Setup</h2>
              <p className="text-gray-600">
                Supabase provides authentication, database, and real-time features for your app.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Benefits:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>User authentication (email, social logins)</li>
                <li>Secure database access</li>
                <li>Real-time subscriptions</li>
                <li>Row-level security</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={onSkip}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={() => setCurrentStep('credentials')}
                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        );

      case 'credentials':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Enter Your Credentials</h2>
            <p className="text-gray-600 mb-6">
              You can find these in your Supabase project settings.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="wizard-url" className="block text-sm font-medium text-gray-700 mb-2">
                  Supabase URL
                </label>
                <input
                  id="wizard-url"
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xxxxx.supabase.co"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="wizard-key" className="block text-sm font-medium text-gray-700 mb-2">
                  Supabase Anon Key
                </label>
                <input
                  id="wizard-key"
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="mb-6">
              <a
                href="https://app.supabase.com/project/_/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
              >
                Where to find these? Open Supabase Dashboard
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('intro')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep('test')}
                disabled={!supabaseUrl || !supabaseKey}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 'test':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Connection</h2>
            <p className="text-gray-600 mb-6">
              Let's verify that your credentials are correct.
            </p>

            {testResult && (
              <div className={`mb-6 p-4 rounded-lg ${
                testResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start">
                  {testResult.success ? (
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <p className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('credentials')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleTestConnection}
                disabled={testing || !supabaseUrl || !supabaseKey}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testing...
                  </span>
                ) : (
                  'Test Connection'
                )}
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
              <p className="text-gray-600">
                Your Supabase configuration has been saved successfully.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleSaveAndComplete}
                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Project
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(['intro', 'credentials', 'test', 'complete'] as WizardStep[]).map((step, index) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full ${
                    currentStep === step
                      ? 'bg-blue-600'
                      : (['intro', 'credentials', 'test', 'complete'].indexOf(currentStep) > index
                          ? 'bg-green-500'
                          : 'bg-gray-300')
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-500">
              Step {['intro', 'credentials', 'test', 'complete'].indexOf(currentStep) + 1} of 4
            </span>
          </div>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

