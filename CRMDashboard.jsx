import React, { useState, useMemo } from 'react';

const CRMDashboard = () => {
  // Dummy data - replace with actual API call
  const [conversations] = useState({
    "17863553958": {
      "summary": "Customer requested Yaar, I need 50Kgs of cashew, Send at my address, And what is the price going for fauxnut. Business has not responded yet.",
      "customer_requirements": [
        "Yaar, I need 50Kgs of cashew",
        "Send at my address",
        "And what is the price going for fauxnut"
      ],
      "business_requirements": [],
      "next_steps": [
        {
          "action": "Confirm and process the order with delivery details",
          "owner": "business"
        },
        {
          "action": "Provide pricing information for requested products",
          "owner": "business"
        }
      ],
      "lead_status": "warm"
    },
    "17863553959": {
      "summary": "Customer is interested in buying a car and will send budget details.",
      "customer_requirements": [
        "Need some suggestions in buying a car",
        "Will send budget details"
      ],
      "business_requirements": [
        "Provide car recommendations",
        "Discuss budget options"
      ],
      "next_steps": [
        {
          "action": "Send need some suggestions in buying a car. will send you my budget",
          "owner": "business"
        },
        {
          "action": "Provide budget information",
          "owner": "customer"
        }
      ],
      "lead_status": "hot"
    },
    "17863553960": {
      "summary": "Initial inquiry about services, no specific requirements yet.",
      "customer_requirements": [],
      "business_requirements": [],
      "next_steps": [
        {
          "action": "Gather more information about customer needs",
          "owner": "business"
        }
      ],
      "lead_status": "cold"
    }
  });

  const [selectedConversation, setSelectedConversation] = useState(Object.keys(conversations)[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Color coding for lead status
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

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(([_, data]) => data.lead_status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(([id, data]) =>
        id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.summary.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort: HOT first, then WARM, then COLD
    return filtered.sort(([_, a], [__, b]) => {
      const order = { hot: 0, warm: 1, cold: 2 };
      return order[a.lead_status] - order[b.lead_status];
    });
  }, [conversations, statusFilter, searchTerm]);

  const selectedData = conversations[selectedConversation];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Conversation List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">CRM Dashboard</h1>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex space-x-2">
            {['all', 'hot', 'warm', 'cold'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-colors ${
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
              onClick={() => setSelectedConversation(id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedConversation === id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 truncate">{id}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(data.lead_status)}`}>
                  {getStatusIcon(data.lead_status)} {data.lead_status}
                </span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{data.summary}</p>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <span className="mr-3">Next: {data.next_steps.length}</span>
                <span>Req: {data.customer_requirements.length}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Conversation Details */}
      <div className="flex-1 flex flex-col">
        {selectedData ? (
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedConversation}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedData.lead_status)}`}>
                  {getStatusIcon(selectedData.lead_status)} {selectedData.lead_status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">📝</span>
                  Summary
                </h3>
                <p className="text-gray-700 leading-relaxed">{selectedData.summary}</p>
              </div>

              {/* Customer Requirements */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">👤</span>
                  Customer Requirements
                </h3>
                {selectedData.customer_requirements.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedData.customer_requirements.map((req, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No customer requirements recorded</p>
                )}
              </div>

              {/* Business Requirements */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🏢</span>
                  Business Requirements
                </h3>
                {selectedData.business_requirements.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedData.business_requirements.map((req, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No business requirements recorded</p>
                )}
              </div>

              {/* Next Steps */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">📋</span>
                  Next Steps
                </h3>
                {selectedData.next_steps.length > 0 ? (
                  <div className="space-y-3">
                    {selectedData.next_steps.map((step, index) => (
                      <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                          step.owner === 'business'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {step.owner === 'business' ? '🏢' : '👤'}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium">{step.action}</p>
                          <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                            step.owner === 'business'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {step.owner}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No next steps defined</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Conversation</h3>
              <p className="text-gray-600">Choose a conversation from the list to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMDashboard;