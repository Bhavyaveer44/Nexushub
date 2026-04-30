const noisePatterns = [
  /^\s*ok\s*$/i,
  /^\s*okay\s*$/i,
  /^\s*thanks\s*$/i,
  /^\s*thank you\s*$/i,
  /^\s*thx\s*$/i,
  /^\s*k\s*$/i,
  /^\s*hello\s*$/i,
  /^\s*hi\s*$/i,
  /^\s*👍+\s*$/u,
  /^\s*\p{P}+\s*$/u,
];

const tokenNoiseRegex = /\b(ok|okay|thanks|thank you|thx|k|hello|hi|👍)\b/giu;

const hindiTranslationMap = {
  'kya': 'what',
  'nahi': 'no',
  'na': 'no',
  'haan': 'yes',
  'han': 'yes',
  'ok': 'ok',
  'thik': 'fine',
  'theek': 'fine',
  'hai': 'is',
  'hun': 'am',
  'hu': 'am',
  'huh': 'am',
  'kaise': 'how',
  'ji': 'sir',
  'yeh': 'this',
  'woh': 'that',
  'acha': 'good',
  'achha': 'good',
  'accha': 'good',
  'tum': 'you',
  'mera': 'my',
  'meri': 'my',
  'mera': 'my',
  'kuch': 'some',
  'dost': 'friend',
  'bhai': 'brother',
  'bahut': 'very',
  'sahi': 'right',
  'mujhe': 'I need',
  'mujhse': 'from me',
  'jarurat': 'need',
  'bhejo': 'send',
  'bhejta': 'am sending',
  'bhejunga': 'will send',
  'bhejna': 'to send',
  'bhej': 'send',
  'apna': 'your',
  'apne': 'your',
  'budget': 'budget',
  'rang': 'color',
  'kala': 'black',
  'party': 'party',
  'jald': 'soon',
  'jaldi': 'quickly',
  'haan': 'yes',
  'nahi': 'no',
  'ji': 'yes',
  'sir': 'sir',
};

const phraseTranslationMap = {
  'apna budget send': 'send your budget',
  'apna budget bhejo': 'send your budget',
  'han bhejta hun': 'yes i am sending',
  'haan bhejta hun': 'yes i am sending',
  'bhai': 'brother',
  'mujhe apna': 'i need your',
};

const bengaliTranslationMap = {
  'ami': 'I',
  'tumi': 'you',
  'ki': 'what',
  'na': 'no',
  'bhalo': 'good',
  'dorkar': 'need',
  'kotha': 'words',
  'dine': 'day',
  'kothay': 'where',
  'kemon': 'how',
  'bhai': 'brother',
  'shundor': 'beautiful',
  'ami': 'I',
  'amar': 'my',
  'tomar': 'your',
};

function isNoiseMessage(text) {
  if (!text || typeof text !== 'string') {
    return true;
  }

  const normalized = text.trim();
  if (!normalized) {
    return true;
  }

  if (noisePatterns.some(pattern => pattern.test(normalized))) {
    return true;
  }

  const stripped = normalized.replace(tokenNoiseRegex, '').replace(/\s+/g, ' ').trim();
  return stripped.length === 0;
}

function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const normalized = text.replace(/\r?\n+/g, ' ').trim();
  if (isNoiseMessage(normalized)) {
    return '';
  }

  const cleaned = normalized
    .replace(tokenNoiseRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

function detectLanguage(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return 'English';
  }

  if (/\p{Script=Devanagari}/u.test(text)) {
    return 'Hindi';
  }

  if (/\p{Script=Bengali}/u.test(text)) {
    return 'Bengali';
  }

  const lower = text.toLowerCase();
  const hinglishTokens = [
    'kya', 'nahi', 'na', 'haan', 'han', 'thik', 'theek', 'kaise', 'ji', 'yeh', 'woh', 'acha', 'accha',
    'tum', 'mera', 'meri', 'kuch', 'dost', 'bahut', 'sahi', 'mujhe', 'mujhse', 'bhejo', 'bhejta', 'bhejunga',
    'apna', 'apne', 'bhai', 'hun', 'hai', 'karo', 'de', 'do', 'kar', 'mein', 'mujh', 'jald', 'jaldi',
    'batao', 'bhejna', 'hello', 'namaste', 'sir', 'accha'
  ];
  const bengaliTokens = [
    'ami', 'tumi', 'ki', 'na', 'bhalo', 'dorkar', 'kotha', 'dine', 'kothay', 'kemon', 'bhai', 'shundor', 'amar', 'tomar'
  ];

  if (hinglishTokens.some(token => new RegExp(`\\b${token}\\b`, 'i').test(lower))) {
    return 'Hinglish';
  }

  if (bengaliTokens.some(token => new RegExp(`\\b${token}\\b`, 'i').test(lower))) {
    return 'Bengali';
  }

  return 'English';
}

function translateToEnglish(text, language) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (language === 'English') {
    return text;
  }

  let translated = text;

  if (language === 'Hindi' || language === 'Hinglish') {
    const lower = translated.toLowerCase();
    let phraseTranslated = lower;

    for (const [source, target] of Object.entries(phraseTranslationMap)) {
      phraseTranslated = phraseTranslated.replace(new RegExp(`\\b${source}\\b`, 'gi'), target);
    }

    translated = phraseTranslated
      .split(/\s+/)
      .map(token => {
        const suffixMatch = token.match(/([.,!?;:]+)$/);
        const normalized = token.toLowerCase().replace(/[.,!?;:]+$/, '');
        const translatedToken = hindiTranslationMap[normalized];
        const result = translatedToken ? translatedToken : token;
        return suffixMatch ? `${result}${suffixMatch[1]}` : result;
      })
      .join(' ');
  }

  if (language === 'Bengali') {
    translated = translated
      .split(/\s+/)
      .map(token => {
        const suffixMatch = token.match(/([.,!?;:]+)$/);
        const normalized = token.toLowerCase().replace(/[.,!?;:]+$/, '');
        const translatedToken = bengaliTranslationMap[normalized];
        const result = translatedToken ? translatedToken : token;
        return suffixMatch ? `${result}${suffixMatch[1]}` : result;
      })
      .join(' ');
  }

  return normalizeMessage(translated);
}

function normalizeMessage(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let normalized = text
    .replace(/\s+/g, ' ')
    .replace(/,{2,}/g, ',')
    .replace(/,\s*([.?!])/g, '$1')
    .replace(/([.,!?]){2,}/g, '$1')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();

  normalized = normalized.replace(/\bi\b/g, 'I');

  if (normalized && /[a-zA-Z]/.test(normalized[0])) {
    normalized = normalized[0].toUpperCase() + normalized.slice(1);
  }

  return normalized;
}

function ensureSentenceEnding(text) {
  const normalized = normalizeMessage(text);
  if (!normalized) {
    return '';
  }

  if (/[.?!]$/.test(normalized)) {
    return normalized;
  }

  return `${normalized}.`;
}

function mapSpeaker(direction) {
  return direction === 'outbound' ? 'business' : 'customer';
}

function preprocessConversation(messages) {
  if (!Array.isArray(messages)) {
    throw new Error('messages must be an array');
  }

  const grouped = {};

  for (const message of messages) {
    if (!message || !message.conversation_id) {
      continue;
    }

    grouped[message.conversation_id] = grouped[message.conversation_id] || [];
    grouped[message.conversation_id].push(message);
  }

  const conversations = {};

  for (const [conversationId, messagesForConversation] of Object.entries(grouped)) {
    const sorted = [...messagesForConversation].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const merged = [];

    for (const record of sorted) {
      const cleaned = cleanText(record.content);
      if (!cleaned) {
        continue;
      }

      const speaker = mapSpeaker(record.direction);
      const language = detectLanguage(cleaned);
      const translated = translateToEnglish(cleaned, language);

      if (!merged.length || merged[merged.length - 1].speaker !== speaker) {
        merged.push({ speaker, message: ensureSentenceEnding(translated) });
        continue;
      }

      const prior = ensureSentenceEnding(merged[merged.length - 1].message);
      merged[merged.length - 1].message = `${prior} ${translated}`.trim();
    }

    conversations[conversationId] = merged.map(item => ({ speaker: item.speaker, message: ensureSentenceEnding(item.message) }));
  }

  return { conversations };
}

module.exports = { preprocessConversation, cleanText, detectLanguage, translateToEnglish };