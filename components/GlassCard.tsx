import React from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  title, 
  icon,
  ...props 
}) => {
  return (
    <div 
      className={`
        relative overflow-hidden
        bg-glass-100 backdrop-blur-xl 
        border border-glass-border 
        rounded-2xl shadow-lg 
        transition-all duration-300
        hover:bg-glass-200 hover:shadow-emerald-900/20
        text-white
        ${className}
      `}
      {...props}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 p-4 border-b border-glass-border bg-glass-100/50">
          {icon && <span className="text-emerald-400">{icon}</span>}
          {title && <h3 className="font-semibold text-lg tracking-wide">{title}</h3>}
        </div>
      )}
      <div className="p-4 h-full">
        {children}
      </div>
    </div>
  );
};