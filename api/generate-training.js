// Disable Vercel caching
export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  // Prevent ALL caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, title, competency, targetLevel, levelDescriptions, language } = req.body;

    // Debug logging
    console.log('=== GENERATE TRAINING API ===');
    console.log('Type:', type);
    console.log('Title:', title);
    console.log('Competency:', competency?.name);
    console.log('Target Level:', targetLevel);
    console.log('Language:', language);
    console.log('============================');

    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    
    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Claude API key not configured' });
    }

    let prompt = '';

    if (type === 'slides') {
      prompt = `Generate a professional training presentation for the following:

Title: ${title}
Competency: ${competency?.name || 'General'}
Target Level: ${targetLevel} (${getLevelName(targetLevel)})
Description: ${competency?.description || 'No description provided'}

Level Descriptions:
- Level 1 (Awareness): ${levelDescriptions?.[1] || 'Can recognize the topic'}
- Level 2 (Knowledge): ${levelDescriptions?.[2] || 'Can explain concepts'}
- Level 3 (Practitioner): ${levelDescriptions?.[3] || 'Can perform with supervision'}
- Level 4 (Proficient): ${levelDescriptions?.[4] || 'Works independently'}
- Level 5 (Expert): ${levelDescriptions?.[5] || 'Can teach others'}

Generate exactly 8 slides for training up to Level ${targetLevel}. For each slide provide:
1. Title (short, clear)
2. Key points (3-4 bullet points)
3. Audio script (what the narrator should say, 2-3 sentences)

Language: ${language || 'English'}

Respond ONLY with valid JSON, no markdown:
{
  "slides": [
    {
      "slide_number": 1,
      "title": "...",
      "key_points": ["...", "...", "..."],
      "audio_script": "..."
    }
  ]
}`;
    } else if (type === 'quiz') {
      prompt = `Generate a quiz for the training module "${title}" about "${competency?.name}".

The trainee should demonstrate Level ${targetLevel} (${getLevelName(targetLevel)}) competency.

Generate exactly 10 multiple choice questions. Each question should have 4 options (A, B, C, D) with one correct answer.

Language: ${language || 'English'}

Respond ONLY with valid JSON, no markdown:
{
  "questions": [
    {
      "question_text": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "points": 1
    }
  ]
}`;
    } else {
      return res.status(400).json({ error: 'Invalid type. Use "slides" or "quiz"' });
    }

    // Log the prompt being sent
    console.log('Sending prompt to Claude for:', title, '/', competency?.name);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return res.status(response.status).json({ error: 'Claude API error', details: error });
    }

    const result = await response.json();
    const content = result.content[0].text;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Generated', parsed.slides?.length || 0, 'slides for:', title);
      return res.status(200).json(parsed);
    } else {
      return res.status(500).json({ error: 'Failed to parse response', raw: content });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function getLevelName(level) {
  const names = {
    1: 'Awareness',
    2: 'Knowledge',
    3: 'Practitioner',
    4: 'Proficient',
    5: 'Expert'
  };
  return names[level] || 'Unknown';
}
