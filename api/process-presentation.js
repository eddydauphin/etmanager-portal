// api/process-presentation.js
// Vercel serverless function to process uploaded presentations

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb'  // Vercel Hobby limit is 4.5MB
    }
  },
  maxDuration: 60  // Allow up to 60 seconds for processing
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileContent, fileName, fileType, title, competency, targetLevel, language } = req.body;

    if (!fileContent) {
      return res.status(400).json({ error: 'No file content provided' });
    }

    // Check file size (base64 is ~33% larger than original)
    const estimatedSize = (fileContent.length * 3) / 4;
    if (estimatedSize > 4 * 1024 * 1024) {
      return res.status(400).json({ 
        error: 'File too large. Please upload a file smaller than 4MB, or use a simpler document.' 
      });
    }

    // Decode base64 file content
    const buffer = Buffer.from(fileContent, 'base64');
    let result = '';

    // Process based on file type
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      result = await extractWithClaude(buffer, 'pdf', title, competency, targetLevel, language);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      fileType === 'application/vnd.ms-powerpoint' ||
      fileName.endsWith('.pptx') ||
      fileName.endsWith('.ppt')
    ) {
      result = await extractWithClaude(buffer, 'pptx', title, competency, targetLevel, language);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword' ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')
    ) {
      result = await extractWithClaude(buffer, 'docx', title, competency, targetLevel, language);
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, PowerPoint, or Word files.' });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error processing presentation:', error);
    return res.status(500).json({ error: error.message || 'Failed to process presentation' });
  }
}

async function extractWithClaude(buffer, fileType, title, competency, targetLevel, language) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY or CLAUDE_API_KEY not configured');
  }

  // Convert buffer to base64 for Claude
  const base64Content = buffer.toString('base64');
  
  // Determine media type
  let mediaType;
  if (fileType === 'pdf') {
    mediaType = 'application/pdf';
  } else if (fileType === 'pptx') {
    mediaType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  } else if (fileType === 'docx') {
    mediaType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  } else {
    mediaType = 'application/pdf'; // fallback
  }

  const prompt = `You are analyzing an uploaded presentation file to create a training module.

Training Module Details:
- Title: ${title || 'Training Module'}
- Competency: ${competency?.name || 'General Training'}
- Target Level: ${targetLevel} (1=Awareness, 2=Knowledge, 3=Practitioner, 4=Proficient, 5=Expert)
- Language: ${language || 'English'}

Please analyze the uploaded document and extract the content to create training slides.

For each slide you create, provide:
1. A clear title
2. 3-4 key learning points (bullet points)
3. An audio narration script (2-3 sentences explaining the slide content)

Also generate 10 quiz questions based on the content. Each question should:
1. Have 4 options (A, B, C, D)
2. Have one correct answer
3. Test understanding at the target competency level

Respond in this exact JSON format:
{
  "slides": [
    {
      "slide_number": 1,
      "title": "Slide Title",
      "key_points": ["Point 1", "Point 2", "Point 3"],
      "audio_script": "Narration script for this slide..."
    }
  ],
  "questions": [
    {
      "question_text": "Question here?",
      "options": ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
      "correct_answer": "A",
      "points": 1
    }
  ]
}

Create 6-10 slides based on the content, and exactly 10 quiz questions.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Content
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to process with Claude');
    }

    const result = await response.json();
    const content = result.content[0].text;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Could not parse response from Claude');
  } catch (error) {
    console.error('Claude processing error:', error);
    throw error;
  }
}
