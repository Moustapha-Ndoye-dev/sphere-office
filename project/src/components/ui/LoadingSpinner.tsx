import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface LoadingSpinnerProps {
  variant?: 'simple' | 'logo';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ variant = 'logo', size = 'md', text }: LoadingSpinnerProps) {
  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  if (variant === 'simple') {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className={`animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 ${sizeClasses[size]}`} />
        {text && <p className="text-gray-600 dark:text-gray-400">{text}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        {settings?.logo ? (
          <img
            src={settings.logo}
            alt="Logo"
            className={`${sizeClasses[size]} object-contain animate-pulse`}
          />
        ) : (
          <div className={`animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 ${sizeClasses[size]}`} />
        )}
        <div className="absolute inset-0 animate-spin">
          <div className={`${sizeClasses[size]} rounded-full border-4 border-transparent border-t-primary-600 opacity-30`} />
        </div>
      </div>
      {text && <p className="text-gray-600 dark:text-gray-400">{text}</p>}
    </div>
  );
}