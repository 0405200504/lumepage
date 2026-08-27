import React from 'react';

interface LoadingStateProps {
  message?: string;
  fullscreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Carregando dados...',
  fullscreen = false
}) => {
  const containerClasses = fullscreen
    ? 'fixed inset-0 z-50 bg-n-100/80 backdrop-blur-xs flex flex-col items-center justify-center'
    : 'flex flex-col items-center justify-center p-12 w-full';

  return (
    <div className={containerClasses}>
      <div className="relative flex items-center justify-center mb-3">
        <div className="h-10 w-10 border-3 border-n-200 rounded-full" />
        <div className="absolute h-10 w-10 border-3 border-t-forest rounded-full animate-spin" />
      </div>
      <p className="text-caption font-semibold text-n-400 tracking-wider uppercase animate-pulse">
        {message}
      </p>
    </div>
  );
};
export default LoadingState;
