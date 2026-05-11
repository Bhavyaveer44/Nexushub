import React from 'react';

const STATUS_STYLES = {
  hot: 'bg-red-100 text-red-800 border-red-200',
  warm: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cold: 'bg-gray-100 text-gray-800 border-gray-200',
};

const STATUS_ICONS = {
  hot: '🔥',
  warm: '🌡️',
  cold: '❄️',
};

const DEFAULT_STYLE = 'bg-gray-100 text-gray-800 border-gray-200';
const DEFAULT_ICON = '📋';

/**
 * StatusBadge — renders a pill badge for a lead status.
 *
 * Props:
 *   status   {string}  — 'hot' | 'warm' | 'cold'
 *   size     {string}  — 'sm' (default) | 'md'
 *   uppercase {boolean} — whether to uppercase the label (default false)
 */
const StatusBadge = ({ status, size = 'sm', uppercase = false }) => {
  const colorClass = STATUS_STYLES[status] ?? DEFAULT_STYLE;
  const icon = STATUS_ICONS[status] ?? DEFAULT_ICON;
  const label = uppercase ? status?.toUpperCase() : status;

  const sizeClass = size === 'md'
    ? 'px-3 py-1 text-xs'
    : 'px-2 py-0.5 text-[10px]';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium border ${colorClass} ${sizeClass}`}>
      {icon} {label}
    </span>
  );
};

export default StatusBadge;
