import React from 'react';

const OWNER_ICONS = {
  business: '🏢',
  customer: '👤',
};

/**
 * NextStepItem — renders a single next-step row.
 *
 * Props:
 *   action  {string} — description of the action
 *   owner   {string} — 'business' | 'customer'
 */
const NextStepItem = ({ action, owner }) => {
  const icon = OWNER_ICONS[owner] ?? '📋';

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 min-h-[44px]">
      <span className="text-base leading-snug flex-shrink-0 mt-0.5">{icon}</span>
      <p className="flex-1 text-xs sm:text-sm text-gray-800 leading-snug">{action}</p>
    </div>
  );
};

export default NextStepItem;
