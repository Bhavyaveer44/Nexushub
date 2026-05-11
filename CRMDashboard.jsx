import React, { useState, useMemo } from 'react';
import ConversationList from './components/ConversationList';
import ConversationDetail from './components/ConversationDetail';

// ─── Static seed data ────────────────────────────────────────────────────────

const INITIAL_CONVERSATIONS = {
  "17863553958": {
    summary: "Customer requested Yaar, I need 50Kgs of cashew, Send at my address, And what is the price going for fauxnut. Business has not responded yet.",
    customer_requirements: [
      "Yaar, I need 50Kgs of cashew",
      "Send at my address",
      "And what is the price going for fauxnut",
    ],
    business_requirements: [],
    next_steps: [
      { action: "Confirm and process the order with delivery details", owner: "business" },
      { action: "Provide pricing information for requested products", owner: "business" },
    ],
    lead_status: "warm",
  },
  "17863553959": {
    summary: "Customer is interested in buying a car and will send budget details.",
    customer_requirements: [
      "Need some suggestions in buying a car",
      "Will send budget details",
    ],
    business_requirements: [
      "Provide car recommendations",
      "Discuss budget options",
    ],
    next_steps: [
      { action: "Send need some suggestions in buying a car. will send you my budget", owner: "business" },
      { action: "Provide budget information", owner: "customer" },
    ],
    lead_status: "hot",
  },
  "17863553960": {
    summary: "Initial inquiry about services, no specific requirements yet.",
    customer_requirements: [],
    business_requirements: [],
    next_steps: [
      { action: "Gather more information about customer needs", owner: "business" },
    ],
    lead_status: "cold",
  },
};

const STATUS_ORDER = { hot: 0, warm: 1, cold: 2 };

// ─── CRMDashboard ─────────────────────────────────────────────────────────────

/**
 * CRMDashboard — top-level container that owns all state and composes the
 * ConversationList and ConversationDetail panels.
 *
 * Layout strategy:
 *   • Mobile  (<sm): flex-col — list stacks above detail; the detail panel
 *     slides into view (via conditional rendering) when a row is tapped, and
 *     a back button returns to the list.
 *   • Desktop (≥sm): flex-row — both panels are always visible side-by-side.
 */
const CRMDashboard = () => {
  const [conversations] = useState(INITIAL_CONVERSATIONS);

  const [selectedId, setSelectedId] = useState(Object.keys(INITIAL_CONVERSATIONS)[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // On mobile, track whether the detail panel is in view.
  const [showDetail, setShowDetail] = useState(false);

  // ── Derived data ────────────────────────────────────────────────────────────

  const filteredConversations = useMemo(() => {
    let entries = Object.entries(conversations);

    if (statusFilter !== 'all') {
      entries = entries.filter(([, data]) => data.lead_status === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      entries = entries.filter(
        ([id, data]) =>
          id.toLowerCase().includes(term) ||
          data.summary.toLowerCase().includes(term),
      );
    }

    return entries.sort(
      ([, a], [, b]) =>
        (STATUS_ORDER[a.lead_status] ?? 3) - (STATUS_ORDER[b.lead_status] ?? 3),
    );
  }, [conversations, statusFilter, searchTerm]);

  const selectedData = conversations[selectedId] ?? null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectConversation = (id) => {
    setSelectedId(id);
    setShowDetail(true);
  };

  const handleBack = () => setShowDetail(false);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
      {/* Left Panel - Conversation List */}
      {/* Hidden on mobile if detail is shown */}
      <div className={`${showDetailOnMobile ? 'hidden' : 'flex'} w-full md:flex md:w-1/3 bg-white border-b border-gray-200 md:border-b-0 md:border-r flex-col`}>
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">CRM Dashboard</h1>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter - Scrollable on small screens */}
          <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
            {['all', 'hot', 'warm', 'cold'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize flex-shrink-0 transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(([id, data]) => (
            <div
              key={id}
              onClick={() => handleSelectConversation(id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedConversation === id ? 'bg-blue-50 md:border-l-4 md:border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 truncate">{id}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(data.lead_status)}`}>
                  {getStatusIcon(data.lead_status)} {data.lead_status}
                </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{data.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/*
       * ConversationDetail
       *   Mobile : hidden when the list panel is active
       *   Desktop: always visible, fills remaining space
       */}
      <div
        className={`${!showDetail ? 'hidden' : 'flex'} sm:flex flex-col flex-1 overflow-hidden`}
      >
        <ConversationDetail
          conversationId={selectedId}
          data={selectedData}
          onBack={handleBack}
        />
      </div>
    </div>
  );
};

export default CRMDashboard;
