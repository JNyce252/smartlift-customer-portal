import React from 'react';

const LoadingSpinner = ({ size = 'medium', text = '' }) => {
  const sizeClasses = { small: 'w-6 h-6 border-2', medium: 'w-10 h-10 border-3', large: 'w-16 h-16 border-4' };
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`} />
      {text && <p className="text-gray-400 text-sm">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
