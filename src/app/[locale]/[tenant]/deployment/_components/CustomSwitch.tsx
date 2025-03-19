'use client';

import React from 'react';

interface CustomSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

const CustomSwitch: React.FC<CustomSwitchProps> = ({
  checked,
  onCheckedChange,
  label,
  className = '',
}) => {
  return (
    <div className="flex items-center space-x-2">
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
          checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
        } transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
        onClick={() => onCheckedChange(!checked)}
      >
        <span
          className={`${
            checked ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </button>
    </div>
  );
};

export default CustomSwitch;
