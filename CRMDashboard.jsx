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
    <div className="flex flex-col sm:flex-row h-screen bg-gray-50 overflow-hidden">
      {/*
       * ConversationList
       *   Mobile : hidden when the detail panel is active
       *   Desktop: always visible as a fixed-width sidebar
       */}
      <div
        className={`${showDetail ? 'hidden' : 'flex'} sm:flex flex-col w-full sm:w-72 md:w-80 lg:w-1/3 flex-shrink-0 overflow-hidden`}
      >
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedId}
          statusFilter={statusFilter}
          searchTerm={searchTerm}
          onSelectConversation={handleSelectConversation}
          onStatusFilter={setStatusFilter}
          onSearch={setSearchTerm}
        />
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
