const { logger } = require('./logger');

function normalizeText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*\.\s*/g, '. ')
    .replace(/\s*\?\s*/g, '? ')
    .replace(/\s*!\s*/g, '! ')
    .trim();
}

function sentenceTokens(text) {
  const normalized = normalizeText(text);
  return normalized
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function cleanPhrase(text) {
  return text
    .replace(/^\s*(please|pls|kindly)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[,.:;!?]+$/g, '')
    .trim();
}

function isFollowUpSentence(sentence) {
  return /\b(update|actually|instead|also|again|further|more|additional|previous|prior|as before|same)\b/i.test(sentence);
}

function extractRequestSentence(sentence) {
  const lower = sentence.toLowerCase();
  if (!/(need|want|looking for|interested in|please send|can you send|send me|show me|provide|recommend|would like|would love|looking to buy|looking to purchase|price|cost|quote|send at|deliver|shipping|delivery|what is the|how much)/i.test(sentence)) {
    return null;
  }

  const request = cleanPhrase(sentence.replace(/^(please|pls|kindly)\s+/i, ''));
  return request.length > 0 ? request : null;
}

function extractBusinessAction(sentence) {
  const lower = sentence.toLowerCase();
  if (lower.includes('budget')) {
    return 'Request customer budget';
  }
  if (/\b(send|provide|share|give|recommend|offer|quote|submit|deliver)\b/i.test(sentence) && /\b(option|options|suggestion|suggestions|proposal|product|products|service|services|details|information|specs|specifications)\b/i.test(sentence)) {
    return cleanPhrase(sentence);
  }
  if (/\b(need|require|request|ask)\b.*\b(budget|details|information|requirements|specifications)\b/i.test(sentence)) {
    return cleanPhrase(sentence);
  }
  if (/(follow up|follow-up|schedule|call|meeting|appointment)/i.test(sentence)) {
    return 'Schedule a follow-up';
  }
  if (/(confirm|check|validate|verify|agree)/i.test(sentence) && /\b(request|need|require|ask|send|provide|offer)\b/i.test(sentence)) {
    return cleanPhrase(sentence);
  }
  return null;
}

function extractProductEntity(text) {
  const lower = text.toLowerCase();

  // Match quantity + product (e.g., "50kgs of cashew")
  const quantityMatch = text.match(/(\d+)\s*(?:kg|kgs|gm|gms|pieces|pcs)\s+(?:of\s+)?([a-zA-Z0-9 &\-]+)/i);
  if (quantityMatch) {
    return `${quantityMatch[1]}${quantityMatch[0].match(/kg|kgs|gm|gms|pieces|pcs/i)[0]} ${quantityMatch[2]}`;
  }

  // Match price/cost inquiry for a specific product (e.g., "price of fauxnut", "what is the cost of cashew")
  const priceMatch = text.match(/(?:what\s+is\s+)?(?:the\s+)?(?:price|cost)\s+(?:of\s+)?([a-zA-Z0-9 &\-]+?)(?:\?|$|\s+is|\s+are|\s+\.)/i);
  if (priceMatch && priceMatch[1]) {
    const product = priceMatch[1].trim();
    // Filter out non-product words
    if (!['address', 'delivery', 'order', 'item', 'thing'].includes(product.toLowerCase())) {
      return `${product} (price inquiry)`;
    }
  }

  // Generic product patterns
  const productPatterns = [
    /(?:need|want|looking for|interested in|would like|would love|buy|purchase|find)\s+(?:a\s+|an\s+|some\s+|the\s+)?([a-zA-Z0-9 &\-]+?)(?:\s+for|\s+in|\s+with|\s+by|\s+to|\s+\.|\s+\?|\s+!|$)/i,
    /(?:send|provide|share|recommend|quote|offer)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+|the\s+)?([a-zA-Z0-9 &\-]+?)(?:\s+for|\s+in|\s+with|\s+by|\s+\.|\s+\?|\s+!|$)/i,
  ];

  for (const pattern of productPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = cleanPhrase(match[1]);
      if (!/\b(it|them|that|those|this|these|address|delivery|order)\b/i.test(candidate)) {
        return candidate;
      }
    }
  }

  const genericMatch = text.match(/\b(product|service|solution|item|software|hardware)\b/i);
  return genericMatch ? genericMatch[1].toLowerCase() : null;
}

function extractBudgetEntity(text) {
  const amountMatch = text.match(/\b(\$|usd|eur|gbp|₹|rs\.?|eur|€|£|¥)\s?([0-9,.]+)(k|m)?\b/i);
  if (amountMatch) {
    return amountMatch[0];
  }

  const budgetPhrase = text.match(/\bbudget\b[^.?!]*/i);
  if (budgetPhrase) {
    return cleanPhrase(budgetPhrase[0]);
  }

  return null;
}

function extractTimelineEntity(text) {
  const timelinePatterns = [
    /\b(by|before|within|in)\s+(\d+\s+(days|weeks|months|hours)|next\s+week|next\s+month|end of month|end of quarter|end of year)\b/i,
    /\b(tomorrow|today|next week|next month|this week|this month|end of month|end of quarter|end of year)\b/i,
    /\b(after\s+\d+\s+(days|weeks|months)|in\s+\d+\s+(days|weeks|months))\b/i,
  ];

  for (const pattern of timelinePatterns) {
    const match = text.match(pattern);
    if (match) {
      return cleanPhrase(match[0]);
    }
  }

  return null;
}

function extractLocationEntity(text, type) {
  const patterns = {
    pickup: [
      /(?:pickup|pick up)(?: location)?(?: is| at| from)?\s*[:\-]?\s*([\w\d\s,'\.-]+?)(?:\s+to\s+|\s+for\s+|\s+with\s+|\s+and\s+|\s*$)/i,
      /from\s+([\w\d\s,'\.-]+?)(?:\s+to\s+|\s+deliver|\s+delivery|\s+ship|\s+shipment|\s+with|\s*$)/i,
    ],
    delivery: [
      /(?:delivery|deliver)(?: location)?(?: is| at| to)?\s*[:\-]?\s*([\w\d\s,'\.-]+?)(?:\s+by\s+|\s+on\s+|\s+tomorrow|\s+today|\s+this|\s+next|\s+same|\s+urgent|\s*$)/i,
      /to\s+([\w\d\s,'\.-]+?)(?:\s+by\s+|\s+on\s+|\s+tomorrow|\s+today|\s+this|\s+next|\s+same|\s+urgent|\s*$)/i,
    ],
  };

  for (const pattern of patterns[type]) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return cleanPhrase(match[1]);
    }
  }

  return null;
}

function extractShipmentType(text) {
  const match = text.match(/\b(parcel|bulk|fragile|document|oversized|pallet|crate|container|cargo|freight|express|standard|small parcel)\b/i);
  return match ? match[1].toLowerCase() : null;
}

function extractWeightEntity(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms|g|grams|lbs|lb|pounds|tons|ton|t)\b/i);
  return match ? `${match[1]} ${match[2]}` : null;
}

function extractDimensionsEntity(text) {
  const pattern = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*(cm|mm|m|in|inch|ft|feet)?/i;
  const match = text.match(pattern);
  if (match) {
    return `${match[1]} x ${match[2]}${match[3] ? ` x ${match[3]}` : ''}${match[4] ? ` ${match[4]}` : ''}`.trim();
  }
  return null;
}

function extractSpecialHandling(text) {
  const match = text.match(/\b(fragile|temperature controlled|refrigerated|cold storage|hazardous|insured|white glove|overnight|express|secure|high value)\b/i);
  return match ? match[1].toLowerCase() : null;
}

function extractKeyEntities(messages) {
  let pickup_location = null;
  let delivery_location = null;
  let shipment_type = null;
  let weight = null;
  let dimensions = null;
  let timeline = null;
  let special_handling = null;

  for (const msg of messages) {
    const text = normalizeText(msg.message || '');
    if (!text) continue;

    if (!pickup_location) {
      pickup_location = extractLocationEntity(text, 'pickup');
    }
    if (!delivery_location) {
      delivery_location = extractLocationEntity(text, 'delivery');
    }
    if (!shipment_type) {
      shipment_type = extractShipmentType(text);
    }
    if (!weight) {
      weight = extractWeightEntity(text);
    }
    if (!dimensions) {
      dimensions = extractDimensionsEntity(text);
    }
    if (!timeline) {
      timeline = extractTimelineEntity(text);
    }
    if (!special_handling) {
      special_handling = extractSpecialHandling(text);
    }

    if (pickup_location && delivery_location && shipment_type && weight && timeline && special_handling) {
      break;
    }
  }

  return {
    pickup_location: pickup_location || null,
    delivery_location: delivery_location || null,
    shipment_type: shipment_type || null,
    weight: weight || null,
    dimensions: dimensions || null,
    timeline: timeline || null,
    special_handling: special_handling || null,
  };
}


function extractCustomerRequirements(messages) {
  const requirements = [];
  const seen = new Set();
  const followUpSentences = [];

  for (const msg of messages) {
    if (msg.speaker !== 'customer' || !msg.message) continue;

    for (const sentence of sentenceTokens(msg.message)) {
      const lower = sentence.toLowerCase();
      let request = extractRequestSentence(sentence);

      if (!request) {
        if (/(pickup|deliver|ship|send|transport|freight|cargo|book|schedule)/i.test(lower)) {
          request = cleanPhrase(sentence);
        }
      }

      if (!request) continue;

      const normalized = cleanPhrase(request);
      if (normalized.length < 5 || seen.has(normalized.toLowerCase())) continue;

      seen.add(normalized.toLowerCase());
      requirements.push(normalized.charAt(0).toUpperCase() + normalized.slice(1));
      if (isFollowUpSentence(sentence)) {
        followUpSentences.push(normalized);
      }
    }
  }

  return { requirements, followUpSentences };
}

function extractBusinessRequirements(messages, logisticsEntities) {
  const requirements = [];
  const seen = new Set();

  const missingFields = [];
  if (!logisticsEntities.pickup_location) missingFields.push('pickup location');
  if (!logisticsEntities.delivery_location) missingFields.push('delivery location');
  if (!logisticsEntities.shipment_type) missingFields.push('shipment type');
  if (!logisticsEntities.weight && !logisticsEntities.dimensions) missingFields.push('weight or dimensions');
  if (!logisticsEntities.timeline) missingFields.push('delivery timeline');

  if (missingFields.length > 0) {
    const requirement = `Obtain ${missingFields.join(', ')}`;
    requirements.push(requirement.charAt(0).toUpperCase() + requirement.slice(1));
  }

  for (const msg of messages) {
    if (msg.speaker !== 'business' || !msg.message) continue;

    for (const sentence of sentenceTokens(msg.message)) {
      const action = extractBusinessAction(sentence);
      if (!action) continue;

      const normalized = cleanPhrase(action);
      if (normalized.length < 5 || seen.has(normalized.toLowerCase())) continue;

      seen.add(normalized.toLowerCase());
      requirements.push(normalized.charAt(0).toUpperCase() + normalized.slice(1));
    }
  }

  return requirements;
}

function buildSummary(messages, customerRequirements, businessRequirements, followUpSentences, logisticsEntities) {
  const firstCustomer = messages.find(m => m.speaker === 'customer' && m.message);
  const routeParts = [];
  if (logisticsEntities.pickup_location) routeParts.push(`from ${logisticsEntities.pickup_location}`);
  if (logisticsEntities.delivery_location) routeParts.push(`to ${logisticsEntities.delivery_location}`);

  const shipmentType = logisticsEntities.shipment_type ? `${logisticsEntities.shipment_type} shipment` : 'logistics request';
  const timeline = logisticsEntities.timeline ? logisticsEntities.timeline : null;
  const specialHandling = logisticsEntities.special_handling ? logisticsEntities.special_handling : null;

  const introParts = [shipmentType];
  if (routeParts.length > 0) introParts.push(routeParts.join(' '));
  if (timeline) introParts.push(timeline);
  if (specialHandling) introParts.push(`special handling: ${specialHandling}`);

  const intro = introParts.length > 0
    ? `Customer needs ${introParts.join(' ')}.`
    : firstCustomer ? cleanPhrase(firstCustomer.message) : 'Customer logistics request received.';

  const followUpText = followUpSentences.length > 0
    ? ` The conversation updates a previous request with: ${followUpSentences.join(', ')}.`
    : '';

  let businessText = '';
  if (businessRequirements.length > 0) {
    businessText = ` Business needs ${businessRequirements.join(', ')}.`;
  } else if (messages.some(m => m.speaker === 'business')) {
    businessText = ' Business has replied and is clarifying next steps.';
  } else {
    businessText = ' Business has not responded yet.';
  }

  const summary = `${intro}${followUpText}${businessText}`.trim();
  return summary.length <= 320 ? summary : `${summary.slice(0, 317).trim()}...`;
}

function buildNextSteps(customerRequirements, businessRequirements, hasBusinessReply, followUpSentences, allMessages, logisticsEntities, previousOutputs = []) {
  const steps = [];
  const allText = (allMessages || []).map(m => m.message || '').join(' ').toLowerCase();

  const hasPickup = Boolean(logisticsEntities.pickup_location);
  const hasDelivery = Boolean(logisticsEntities.delivery_location);
  const hasShipmentType = Boolean(logisticsEntities.shipment_type);
  const hasWeight = Boolean(logisticsEntities.weight);
  const hasDimensions = Boolean(logisticsEntities.dimensions);
  const hasTimeline = Boolean(logisticsEntities.timeline);
  const hasSpecial = Boolean(logisticsEntities.special_handling);

  const pendingSteps = new Map();
  for (const prevOutput of previousOutputs) {
    if (prevOutput.next_steps) {
      let prevSteps = [];
      if (typeof prevOutput.next_steps === 'string') {
        try {
          prevSteps = JSON.parse(prevOutput.next_steps);
        } catch (e) {
          logger.warn('Failed to parse previous next_steps', { error: e.message });
          continue;
        }
      } else {
        prevSteps = prevOutput.next_steps;
      }

      for (const step of prevSteps) {
        const key = `${step.action}-${step.owner}`;
        if (!pendingSteps.has(key)) {
          pendingSteps.set(key, step);
        }
      }
    }
  }

  if (!hasPickup) {
    steps.push({ action: 'Collect pickup location from the customer', owner: 'business' });
  }
  if (!hasDelivery) {
    steps.push({ action: 'Collect delivery location from the customer', owner: 'business' });
  }
  if (!hasShipmentType) {
    steps.push({ action: 'Clarify shipment type', owner: 'business' });
  }
  if (!hasWeight && !hasDimensions) {
    steps.push({ action: 'Confirm shipment weight or package dimensions', owner: 'business' });
  }
  if (!hasTimeline) {
    steps.push({ action: 'Confirm delivery timeline', owner: 'business' });
  }
  if (!hasSpecial && /fragile|temperature|refrigerated|hazardous|insured|white glove|secure/i.test(allText)) {
    steps.push({ action: 'Confirm special handling requirements', owner: 'business' });
  }

  if (/(quote|pricing|cost|rate|price)/i.test(allText)) {
    steps.push({ action: 'Share pricing or quotation with the customer', owner: 'business' });
  }
  if (/(availability|available|capacity|space|slot)/i.test(allText)) {
    steps.push({ action: 'Check service availability', owner: 'business' });
  }

  if (/\b(book|ship|deliver|pickup|dispatch|schedule pickup|schedule delivery|book pickup|book delivery)\b/i.test(allText) && hasPickup && hasDelivery && (hasWeight || hasDimensions)) {
    steps.push({ action: 'Proceed with booking the shipment', owner: 'business' });
  }

  if (followUpSentences.length > 0) {
    steps.unshift({ action: 'Confirm the updated logistics request', owner: 'business' });
  }

  if (customerRequirements.length > 0 && !hasBusinessReply) {
    steps.push({ action: 'Respond to the customer request', owner: 'business' });
  }

  const allSteps = [...pendingSteps.values(), ...steps];
  const uniqueSteps = [];
  const seen = new Set();

  for (const step of allSteps) {
    const key = `${step.action}-${step.owner}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSteps.push(step);
    }
  }

  if (uniqueSteps.length === 0) {
    uniqueSteps.push({ action: 'Clarify next logistics steps with the customer', owner: 'business' });
  }

  return uniqueSteps;
}

function determineLeadStatus(messages, customerRequirements, businessRequirements, logisticsEntities) {
  const hasCustomerMessage = messages.some(m => m.speaker === 'customer');
  const hasBusinessReply = messages.some(m => m.speaker === 'business');
  const allText = (messages || []).map(m => m.message || '').join(' ').toLowerCase();

  const hasIntent = /\b(book|ship|deliver|pickup|dispatch|schedule pickup|schedule delivery|book pickup|book delivery)\b/i.test(allText);
  const completeDetails = logisticsEntities.pickup_location && logisticsEntities.delivery_location && logisticsEntities.shipment_type && (logisticsEntities.weight || logisticsEntities.dimensions);

  if (!hasCustomerMessage) return 'cold';
  if (completeDetails && hasIntent) return 'hot';
  if (hasBusinessReply && (customerRequirements.length > 0 || businessRequirements.length > 0)) return 'hot';
  if (hasCustomerMessage) return 'warm';
  return 'cold';
}

function processConversation(conversationId, messages, previousOutputs = []) {
  try {
    const logisticsEntities = extractKeyEntities(messages);
    const customerData = extractCustomerRequirements(messages);
    const businessRequirements = extractBusinessRequirements(messages, logisticsEntities);
    const summary = buildSummary(messages, customerData.requirements, businessRequirements, customerData.followUpSentences, logisticsEntities);
    const nextSteps = buildNextSteps(customerData.requirements, businessRequirements, messages.some(m => m.speaker === 'business'), customerData.followUpSentences, messages, logisticsEntities, previousOutputs);
    const leadStatus = determineLeadStatus(messages, customerData.requirements, businessRequirements, logisticsEntities);

    return {
      summary,
      customer_requirements: customerData.requirements,
      business_requirements: businessRequirements,
      next_steps: nextSteps,
      lead_status: leadStatus,
      logistics_entities: logisticsEntities,
    };
  } catch (error) {
    logger.error('Error processing conversation', { conversationId, error: error.message, stack: error.stack });
    return {
      summary: '',
      customer_requirements: [],
      business_requirements: [],
      next_steps: [],
      lead_status: 'cold',
      key_entities: { product: null, budget: null, timeline: null },
    };
  }
}

function processConversations(conversationsData, previousOutputs = []) {
  if (!conversationsData || typeof conversationsData !== 'object') {
    throw new Error('conversationsData must be a valid object');
  }

  const results = {};

  for (const [conversationId, messages] of Object.entries(conversationsData)) {
    if (!Array.isArray(messages)) {
      logger.warn('Skipping invalid conversation', { conversationId });
      continue;
    }

    results[conversationId] = processConversation(conversationId, messages, previousOutputs);
  }

  return { results };
}

module.exports = { processConversations, processConversation };
