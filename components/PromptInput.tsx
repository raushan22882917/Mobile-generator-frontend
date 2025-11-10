'use client';

import { useState } from 'react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export default function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate minimum 10 characters
    if (prompt.trim().length < 10) {
      setError('Prompt must be at least 10 characters long');
      return;
    }
    
    setError('');
    onSubmit(prompt.trim());
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (error) setError('');
  };

  const charCount = prompt.length;
  const isValid = prompt.trim().length >= 10;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-2">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
          Describe your app idea
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="Example: Create a simple todo app with the ability to add, complete, and delete tasks. Use a clean, modern design with a blue color scheme."
          className={`w-full h-32 px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={1000}
        />
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm">
          <span className={charCount < 10 ? 'text-red-500' : 'text-gray-500'}>
            {charCount} / 1000 characters
          </span>
          {charCount < 10 && (
            <span className="text-red-500 ml-2">(minimum 10)</span>
          )}
        </div>
        {error && (
          <span className="text-sm text-red-500">{error}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || !isValid}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </span>
        ) : (
          'Generate App'
        )}
      </button>
    </form>
  );
}
