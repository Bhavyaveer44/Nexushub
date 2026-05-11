import React from 'react';
import StatusBadge from './StatusBadge';

const FILTER_OPTIONS = ['all', 'hot', 'warm', 'cold'];

/**
 * ConversationList — left panel showing search, status filters, and the
 * scrollable list of conversation entries.
 *
 * Props:
 *   conversations        {Array}    — filtered & sorted [id, data] pairs
 *   selectedId           {string}   — currently selected conversation id
 *   statusFilter         {string}   — active filter value
 *   searchTerm           {string}   — current search input value
 *   onSelectConversation {Function} — called with id when a row is clicked
 *   onStatusFilter       {Function} — called with new filter value
 *   onSearch             {Function} — called with new search string
 */
const ConversationList = ({
  conversations,
  selectedId,
  statusFilter,
  searchTerm,
  onSelectConversation,
  onStatusFilter,
  onSearch,
}) => (
  <div className="flex flex-col bg-white border-b sm:border-b-0 sm:border-r border-gray-200 w-full sm:w-72 md:w-80 lg:w-1/3 flex-shrink-0">
    {/* Header */}
    <div className="p-4 sm:p-5 border-b border-gray-200">
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
        CRM Dashboard
      </h1>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search conversations…"
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
        />
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTER_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => onStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize flex-shrink-0 transition-colors min-h-[36px] ${
              statusFilter === status
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
            }`}
          >
            {status}
          </button>
        ))}
      </div>
    </div>

    {/* Conversation rows */}
    <div className="flex-1 overflow-y-auto">
      {conversations.length === 0 ? (
        <p className="p-4 text-sm text-gray-400 text-center">No conversations found.</p>
      ) : (
        conversations.map(([id, data]) => (
          <button
            key={id}
            onClick={() => onSelectConversation(id)}
            className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-blue-50 min-h-[44px] ${
              selectedId === id
                ? 'bg-blue-50 border-l-4 border-l-blue-500'
                : 'border-l-4 border-l-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="font-medium text-sm text-gray-900 truncate">{id}</span>
              <StatusBadge status={data.lead_status} size="sm" />
            </div>
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {data.summary}
            </p>
          </button>
        ))
      )}
    </div>
  </div>
);

export default ConversationList;
