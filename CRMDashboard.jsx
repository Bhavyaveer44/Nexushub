import React, { useState, useMemo } from 'react';

const CRMDashboard = () => {
  const [conversations] = useState({
    "17863553958": {
      "summary": "Customer requested Yaar, I need 50Kgs of cashew, Send at my address, And what is the price going for fauxnut. Business has not responded yet.",
      "customer_requirements": ["Yaar, I need 50Kgs of cashew", "Send at my address", "And what is the price going for fauxnut"],
      "business_requirements": [],
      "next_steps": [
        { "action": "Confirm and process the order with delivery details", "owner": "business" },
        { "action": "Provide pricing information for requested products", "owner": "business" }
      ],
      "lead_status": "warm"
    },
    "17863553959": {
      "summary": "Customer is interested in buying a car and will send budget details.",
      "customer_requirements": ["Need some suggestions in buying a car", "Will send budget details"],
      "business_requirements": ["Provide car recommendations", "Discuss budget options"],
      "next_steps": [
        { "action": "Send need some suggestions in buying a car. will send you my budget", "owner": "business" },
        { "action": "Provide budget information", "owner": "customer" }
      ],
      "lead_status": "hot"
    },
    "17863553960": {
      "summary": "Initial inquiry about services, no specific requirements yet.",
      "customer_requirements": [],
      "business_requirements": [],
      "next_steps": [{ "action": "Gather more information about customer needs", "owner": "business" }],
      "lead_status": "cold"
    }
  });

  const [selectedConversation, setSelectedConversation] = useState(Object.keys(conversations)[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // state to handle mobile view switching
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);

  // Helper for status styles
  const getStatusColor = (status) => {
    switch (status) {
      case 'hot': return 'bg-red-100 text-red-800 border-red-200';
      case 'warm': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cold': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'hot': return '🔥';
      case 'warm': return '🌡️';
      case 'cold': return '❄️';
      default: return '📋';
    }
  };

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    let filtered = Object.entries(conversations);
    if (statusFilter !== 'all') {
      filtered = filtered.filter(([_, data]) => data.lead_status === statusFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(([id, data]) =>
        id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.summary.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered.sort(([_, a], [__, b]) => {
      const order = { hot: 0, warm: 1, cold: 2 };
      return order[a.lead_status] - order[b.lead_status];
    });
  }, [conversations, statusFilter, searchTerm]);

  const selectedData = conversations[selectedConversation];

  // Mobile navigation handler
  const handleSelectConversation = (id) => {
    setSelectedConversation(id);
    setShowDetailOnMobile(true);
  };

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

      {/* Right Panel - Conversation Details */}
      {/* Hidden on mobile if list is shown */}
      <div className={`${!showDetailOnMobile ? 'hidden' : 'flex'} w-full md:flex md:flex-1 flex-col bg-gray-50`}>
        {selectedData ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header with Back Button for Mobile */}
            <div className="bg-white border-b border-gray-200 p-4 md:p-6 flex items-center gap-4">
              <button 
                onClick={() => setShowDetailOnMobile(false)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full"
              >
                ←
              </button>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedConversation}</h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedData.lead_status)}`}>
                  {getStatusIcon(selectedData.lead_status)} {selectedData.lead_status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Summary Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                  <span className="mr-2">📝</span> Summary
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedData.summary}</p>
              </div>

              {/* Grid for Requirements (Stacked on mobile, side-by-side on desktop) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">👤</span> Customer Needs
                  </h3>
                  <ul className="space-y-2">
                    {selectedData.customer_requirements.map((req, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🏢</span> Business Needs
                  </h3>
                  {selectedData.business_requirements.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedData.business_requirements.map((req, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-gray-400 italic">None</p>}
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🚀</span> Next Steps
                </h3>
                <div className="space-y-3">
                  {selectedData.next_steps.map((step, i) => (
                    <div key={i} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                      <span className="mr-3">{step.owner === 'business' ? '🏢' : '👤'}</span>
                      <p className="flex-1 text-gray-800">{step.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <p className="text-gray-500">Select a lead to see details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMDashboard;