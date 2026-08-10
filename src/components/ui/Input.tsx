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
          className={`w-full bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-ios-darkCard focus:border-ios-primary focus:ring-2 focus:ring-ios-primary/20 rounded-2xl h-12 px-4 outline-none transition-all ${
            error ? 'border-ios-danger focus:border-ios-danger focus:ring-ios-danger/20 bg-red-50 dark:bg-red-900/10' : ''
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
