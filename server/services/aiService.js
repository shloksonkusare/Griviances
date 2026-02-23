/**
 * AI Classification Service
 * Provides auto-categorization, sentiment analysis, and urgency scoring
 * 
 * Note: In production, integrate with actual AI services like:
 * - Google Cloud Vision API for image classification
 * - OpenAI GPT for text analysis
 * - Azure Cognitive Services
 */

// Category keywords for basic classification
const CATEGORY_KEYWORDS = {
  road_damage: [
    'road', 'pothole', 'crack', 'broken', 'damaged', 'street', 'pavement',
    'asphalt', 'highway', 'path', 'footpath', 'sidewalk', 'गड्ढा', 'सड़क',
    'रस्ता', 'खड्डा'
  ],
  street_light: [
    'light', 'lamp', 'bulb', 'dark', 'electricity', 'pole', 'street light',
    'not working', 'broken light', 'बत्ती', 'लाइट', 'दिवा'
  ],
  water_supply: [
    'water', 'pipe', 'leak', 'supply', 'tap', 'drinking', 'pipeline', 'burst',
    'no water', 'dirty water', 'पानी', 'नल', 'पाणी'
  ],
  sewage: [
    'sewage', 'drainage', 'drain', 'blocked', 'overflow', 'smell', 'gutter',
    'sewer', 'clogged', 'नाली', 'गटर', 'सीवर'
  ],
  garbage: [
    'garbage', 'trash', 'waste', 'dump', 'dirty', 'rubbish', 'litter',
    'not collected', 'pile', 'कचरा', 'कूड़ा', 'कचरापेटी'
  ],
  encroachment: [
    'encroachment', 'illegal', 'occupation', 'blocking', 'footpath blocked',
    'obstruction', 'अतिक्रमण', 'कब्जा'
  ],
  noise_pollution: [
    'noise', 'loud', 'sound', 'music', 'speaker', 'horn', 'construction noise',
    'शोर', 'आवाज', 'ध्वनी'
  ],
  illegal_construction: [
    'construction', 'building', 'illegal', 'unauthorized', 'permit',
    'निर्माण', 'बांधकाम'
  ],
  traffic: [
    'traffic', 'signal', 'jam', 'congestion', 'accident', 'parking',
    'यातायात', 'वाहतूक', 'सिग्नल'
  ],
};

// Urgency keywords
const URGENCY_KEYWORDS = {
  high: [
    'urgent', 'emergency', 'dangerous', 'accident', 'immediate', 'critical',
    'risk', 'hazard', 'life threatening', 'आपातकाल', 'खतरनाक', 'तत्काळ'
  ],
  medium: [
    'important', 'soon', 'needed', 'problem', 'issue', 'complaint',
    'महत्वपूर्ण', 'समस्या'
  ],
};

// Sentiment keywords
const SENTIMENT_KEYWORDS = {
  negative: [
    'bad', 'terrible', 'worst', 'horrible', 'disgusting', 'pathetic',
    'useless', 'failure', 'neglect', 'बुरा', 'खराब', 'वाईट'
  ],
  urgent: [
    'help', 'please', 'urgent', 'immediately', 'asap', 'emergency',
    'मदद', 'तुरंत', 'मदत'
  ],
};

/**
 * Classify text into a category
 */
const classifyCategory = (text) => {
  if (!text) return { category: 'other', confidence: 0, keywords: [] };
  
  const normalizedText = text.toLowerCase();
  const matchedKeywords = {};
  let bestMatch = { category: 'other', count: 0, keywords: [] };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(keyword => 
      normalizedText.includes(keyword.toLowerCase())
    );
    
    if (matches.length > bestMatch.count) {
      bestMatch = { category, count: matches.length, keywords: matches };
    }
    
    if (matches.length > 0) {
      matchedKeywords[category] = matches;
    }
  }

  // Calculate confidence based on match count
  const confidence = Math.min(bestMatch.count * 20, 100);

  return {
    category: bestMatch.category,
    confidence,
    keywords: bestMatch.keywords,
    allMatches: matchedKeywords,
  };
};

/**
 * Analyze sentiment of text
 */
const analyzeSentiment = (text) => {
  if (!text) return 'neutral';
  
  const normalizedText = text.toLowerCase();
  
  // Check for urgent sentiment first
  for (const keyword of SENTIMENT_KEYWORDS.urgent) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      return 'urgent';
    }
  }
  
  // Check for negative sentiment
  let negativeCount = 0;
  for (const keyword of SENTIMENT_KEYWORDS.negative) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      negativeCount++;
    }
  }
  
  if (negativeCount >= 2) return 'negative';
  if (negativeCount === 1) return 'neutral';
  
  return 'neutral';
};

/**
 * Calculate urgency score (0-100)
 */
const calculateUrgencyScore = (text, category) => {
  if (!text) return 30; // Base score
  
  let score = 30; // Base score
  const normalizedText = text.toLowerCase();
  
  // Add points for urgency keywords
  for (const keyword of URGENCY_KEYWORDS.high) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      score += 20;
    }
  }
  
  for (const keyword of URGENCY_KEYWORDS.medium) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      score += 10;
    }
  }
  
  // Category-based urgency boost
  const highUrgencyCategories = ['water_supply', 'sewage', 'traffic'];
  if (highUrgencyCategories.includes(category)) {
    score += 15;
  }
  
  // Cap at 100
  return Math.min(score, 100);
};

/**
 * Extract keywords from text
 */
const extractKeywords = (text, maxKeywords = 5) => {
  if (!text) return [];
  
  // Simple keyword extraction based on word frequency
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const stopWords = [
    'the', 'and', 'is', 'in', 'to', 'of', 'a', 'for', 'on', 'with', 'this',
    'that', 'are', 'was', 'been', 'have', 'has', 'had', 'but', 'not', 'you',
    'your', 'from', 'they', 'will', 'would', 'there', 'their', 'what', 'about',
    'which', 'when', 'make', 'like', 'time', 'just', 'know', 'take', 'come'
  ];
  
  const filtered = words.filter(word => !stopWords.includes(word));
  
  // Count frequency
  const frequency = {};
  for (const word of filtered) {
    frequency[word] = (frequency[word] || 0) + 1;
  }
  
  // Sort by frequency and return top keywords
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
};

/**
 * Full AI analysis of complaint
 */
const analyzeComplaint = async (description, existingCategory = null) => {
  const classification = classifyCategory(description);
  const sentiment = analyzeSentiment(description);
  const urgencyScore = calculateUrgencyScore(
    description, 
    existingCategory || classification.category
  );
  const keywords = extractKeywords(description);

  return {
    suggestedCategory: classification.category,
    confidence: classification.confidence,
    keywords: [...new Set([...classification.keywords, ...keywords])].slice(0, 10),
    sentiment,
    urgencyScore,
    processedAt: new Date(),
  };
};

/**
 * Detect potential duplicate based on text similarity
 * Simple implementation using Jaccard similarity
 */
const calculateTextSimilarity = (text1, text2) => {
  if (!text1 || !text2) return 0;
  
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
};

/**
 * Suggest priority based on AI analysis
 */
const suggestPriority = (aiClassification) => {
  const { urgencyScore, sentiment } = aiClassification;
  
  if (urgencyScore >= 80 || sentiment === 'urgent') return 'critical';
  if (urgencyScore >= 60) return 'high';
  if (urgencyScore >= 40) return 'medium';
  return 'low';
};

module.exports = {
  classifyCategory,
  analyzeSentiment,
  calculateUrgencyScore,
  extractKeywords,
  analyzeComplaint,
  calculateTextSimilarity,
  suggestPriority,
  CATEGORY_KEYWORDS,
};
