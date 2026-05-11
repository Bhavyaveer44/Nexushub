import React from 'react';

/**
 * RequirementCard — displays a titled list of requirements.
 *
 * Props:
 *   title       {string}   — card heading
 *   icon        {string}   — emoji icon shown before the title
 *   items       {string[]} — list of requirement strings
 *   dotColor    {string}   — Tailwind bg colour class for the bullet dot
 *   emptyLabel  {string}   — text shown when items is empty (default 'None')
 */
const RequirementCard = ({
  title,
  icon,
  items = [],
  dotColor = 'bg-blue-500',
  emptyLabel = 'None',
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
    <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
      <span className="mr-2">{icon}</span>
      {title}
    </h3>

    {items.length > 0 ? (
      <ul className="space-y-2">
        {items.map((req, i) => (
          <li key={i} className="text-xs sm:text-sm text-gray-700 flex items-start">
            <span
              className={`w-1.5 h-1.5 ${dotColor} rounded-full mt-1.5 mr-3 flex-shrink-0`}
            />
            {req}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-gray-400 italic">{emptyLabel}</p>
    )}
  </div>
);

export default RequirementCard;
