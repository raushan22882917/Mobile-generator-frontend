'use client';

interface GenerationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  details?: string;
}

interface GenerationProgressProps {
  steps: GenerationStep[];
  currentStep?: number;
  overallProgress?: number;
}

export default function GenerationProgress({ steps, currentStep, overallProgress = 0 }: GenerationProgressProps) {
  const getStepIcon = (step: GenerationStep, index: number) => {
    if (step.status === 'completed') {
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg ring-2 ring-green-400 ring-offset-2 ring-offset-gray-800">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    
    if (step.status === 'in_progress') {
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }
    
    if (step.status === 'error') {
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }
    
    // Pending
    return (
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center">
        <span className="text-white text-sm font-semibold">{index + 1}</span>
      </div>
    );
  };

  const getStepColor = (step: GenerationStep) => {
    if (step.status === 'completed') return 'text-green-400';
    if (step.status === 'in_progress') return 'text-orange-400';
    if (step.status === 'error') return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
      {/* Overall Progress Bar */}
      {overallProgress > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Overall Progress</span>
            <span className="text-sm font-semibold text-orange-400">{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-3">
            {/* Step Icon */}
            {getStepIcon(step, index)}
            
            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-semibold ${getStepColor(step)} flex items-center gap-2`}>
                  {step.status === 'completed' && (
                    <span className="text-green-400">✓</span>
                  )}
                  {step.title}
                </h4>
                {step.status === 'in_progress' && (
                  <span className="text-xs text-orange-400 animate-pulse">Processing...</span>
                )}
                {step.status === 'completed' && (
                  <span className="text-xs text-green-400 font-medium">Completed</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{step.description}</p>
              {step.details && (
                <p className="text-xs text-gray-500 mt-1 italic">{step.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

