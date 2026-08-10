import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-gray-900 dark:focus:border-white focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 rounded-2xl h-12 px-4 outline-none transition-all ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50 dark:bg-red-900/10' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-ios-danger ml-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
