import React from 'react';
import StatusBadge from './StatusBadge';
import RequirementCard from './RequirementCard';
import NextStepItem from './NextStepItem';

/**
 * ConversationDetail — right panel showing the full detail view for a
 * selected conversation.
 *
 * Props:
 *   conversationId {string}   — the selected conversation id / phone number
 *   data           {object}   — the conversation data object
 *   onBack         {Function} — called when the mobile back button is pressed
 */
const ConversationDetail = ({ conversationId, data, onBack }) => {
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center bg-gray-50">
        <p className="text-sm text-gray-400">Select a lead to see details</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Detail header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3">
        {/* Back button — visible only on small screens */}
        <button
          onClick={onBack}
          aria-label="Back to list"
          className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors text-gray-600 flex-shrink-0"
        >
          ←
        </button>

        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
          <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 truncate">
            {conversationId}
          </h2>
          <StatusBadge status={data.lead_status} size="md" uppercase />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 flex items-center">
            <span className="mr-2">📝</span> Summary
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {data.summary}
          </p>
        </div>

        {/* Requirements — stacked on mobile, side-by-side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RequirementCard
            title="Customer Needs"
            icon="👤"
            items={data.customer_requirements}
            dotColor="bg-blue-500"
          />
          <RequirementCard
            title="Business Needs"
            icon="🏢"
            items={data.business_requirements}
            dotColor="bg-green-500"
          />
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
            <span className="mr-2">🚀</span> Next Steps
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {data.next_steps.length > 0 ? (
              data.next_steps.map((step, i) => (
                <NextStepItem key={i} action={step.action} owner={step.owner} />
              ))
            ) : (
              <p className="text-xs text-gray-400 italic">No next steps defined.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationDetail;
