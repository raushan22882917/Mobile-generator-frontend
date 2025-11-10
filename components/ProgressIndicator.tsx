'use client';

export type ProgressStep = {
  name: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message?: string;
};

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  estimatedTimeRemaining?: number; // in seconds
}

export default function ProgressIndicator({ steps, estimatedTimeRemaining }: ProgressIndicatorProps) {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStepIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'complete':
        return (
          <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'active':
        return (
          <svg className="h-6 w-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'error':
        return (
          <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'pending':
      default:
        return (
          <div className="h-6 w-6 rounded-full border-2 border-gray-300 bg-white"></div>
        );
    }
  };

  const getStepColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'complete':
        return 'text-green-700';
      case 'active':
        return 'text-blue-700 font-semibold';
      case 'error':
        return 'text-red-700';
      case 'pending':
      default:
        return 'text-gray-500';
    }
  };

  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Generation Progress</h3>
          {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
            <span className="text-sm text-gray-600">
              Est. time remaining: <span className="font-medium">{formatTime(estimatedTimeRemaining)}</span>
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="mt-1 text-xs text-gray-500 text-right">
          {completedSteps} of {totalSteps} steps completed
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getStepIcon(step.status)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${getStepColor(step.status)}`}>
                {step.name}
              </p>
              {step.message && (
                <p className="text-xs text-gray-500 mt-1">{step.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
