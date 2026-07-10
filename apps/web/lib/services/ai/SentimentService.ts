export interface SentimentResult {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  breakdown: {
    lighting?: 'Positive' | 'Negative'
    cleanliness?: 'Positive' | 'Negative'
    pitch?: 'Positive' | 'Negative'
    parking?: 'Positive' | 'Negative'
    behaviour?: 'Positive' | 'Negative'
  }
  aiSummary: string
}

export class SentimentService {
  /**
   * Fast, dictionary-based sentiment and topic analysis for review text.
   * Isolates NLP processing locally without blocking requests or incurring API costs.
   */
  static analyzeReview(comment: string): SentimentResult {
    const text = comment.toLowerCase()

    // Match dictionaries
    const posWords = [
      'good',
      'great',
      'awesome',
      'amazing',
      'best',
      'friendly',
      'clean',
      'excellent',
      'love',
      'perfect',
      'nice',
    ]
    const negWords = [
      'bad',
      'poor',
      'dirty',
      'dim',
      'dark',
      'rude',
      'crowded',
      'small',
      'worst',
      'fail',
      'unfriendly',
      'waste',
    ]

    const topics = {
      lighting: ['light', 'lights', 'illumination', 'floodlight', 'floodlights', 'visibility'],
      cleanliness: [
        'clean',
        'dirty',
        'washroom',
        'toilet',
        'garbage',
        'dust',
        'cleanliness',
        'hygiene',
      ],
      pitch: ['pitch', 'ground', 'carpet', 'bounce', 'uneven', 'grass', 'turf', 'box'],
      parking: ['parking', 'park', 'space', 'car', 'bike', 'vehicle'],
      behaviour: ['staff', 'owner', 'manager', 'behaviour', 'host', 'people', 'rude', 'friendly'],
    }

    // 1. Calculate overall sentiment score
    let posCount = 0
    let negCount = 0

    posWords.forEach((w) => {
      if (text.includes(w)) posCount++
    })
    negWords.forEach((w) => {
      if (text.includes(w)) negCount++
    })

    let overallSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL'
    if (posCount > negCount) overallSentiment = 'POSITIVE'
    else if (negCount > posCount) overallSentiment = 'NEGATIVE'

    // 2. Classify specific topics
    const breakdown: SentimentResult['breakdown'] = {}
    const summaries: string[] = []

    for (const [topic, keywords] of Object.entries(topics)) {
      const hasTopic = keywords.some((k) => text.includes(k))
      if (hasTopic) {
        // Evaluate local positive/negative words around topic
        let tPos = 0
        let tNeg = 0
        posWords.forEach((w) => {
          if (text.includes(w)) tPos++
        })
        negWords.forEach((w) => {
          if (text.includes(w)) tNeg++
        })

        if (tPos >= tNeg) {
          breakdown[topic as keyof typeof topics] = 'Positive'
          summaries.push(`praised the ${topic}`)
        } else {
          breakdown[topic as keyof typeof topics] = 'Negative'
          summaries.push(`raised concerns about the ${topic}`)
        }
      }
    }

    // 3. Build summary sentence
    let aiSummary = 'No specific topics highlighted.'
    if (summaries.length > 0) {
      aiSummary = `The player ${summaries.join(' and ')}.`
    }

    return {
      sentiment: overallSentiment,
      breakdown,
      aiSummary,
    }
  }
}
