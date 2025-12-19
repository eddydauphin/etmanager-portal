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
  // Prevent ALL caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
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
    const { fileContent, fileName, fileType, title, competency, targetLevel, language, importMode = 'smart' } = req.body;

    // Debug logging
    console.log('=== PROCESS PRESENTATION API ===');
    console.log('File:', fileName);
    console.log('Title:', title);
    console.log('Competency:', competency?.name);
    console.log('================================');

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
      result = await extractWithClaude(buffer, 'pdf', title, competency, targetLevel, language, importMode);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      fileType === 'application/vnd.ms-powerpoint' ||
      fileName.endsWith('.pptx') ||
      fileName.endsWith('.ppt')
    ) {
      result = await extractWithClaude(buffer, 'pptx', title, competency, targetLevel, language, importMode);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword' ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')
    ) {
      result = await extractWithClaude(buffer, 'docx', title, competency, targetLevel, language, importMode);
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, PowerPoint, or Word files.' });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error processing presentation:', error);
    return res.status(500).json({ error: error.message || 'Failed to process presentation' });
  }
}

async function extractWithClaude(buffer, fileType, title, competency, targetLevel, language, importMode) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY or CLAUDE_API_KEY not configured');
  }

  // Claude's document API only supports PDF
  if (fileType !== 'pdf') {
    throw new Error('Currently only PDF files are supported for upload. Please convert your PowerPoint or Word document to PDF and try again.');
  }

  // Convert buffer to base64 for Claude
  const base64Content = buffer.toString('base64');

  // Different prompts based on import mode
  let prompt;
  
  if (importMode === 'direct') {
    // Direct Import: Preserve original content exactly
    prompt = `You are analyzing an uploaded PDF document to create a training module. Your task is to DIRECTLY IMPORT the content, preserving it exactly as written.

Training Module Details:
- Title: ${title || 'Training Module'}
- Competency: ${competency?.name || 'General Training'}
- Target Level: ${targetLevel} (1=Awareness, 2=Knowledge, 3=Practitioner, 4=Proficient, 5=Expert)
- Language: ${language || 'English'}

IMPORTANT: This is a DIRECT IMPORT. You must:
1. Preserve the EXACT original text and bullet points from the document
2. Do NOT paraphrase, summarize, or restructure the content
3. Keep the original slide/section structure as closely as possible
4. Each page or section in the PDF should become a slide
5. Copy the bullet points exactly as they appear

For each slide:
1. Use the original heading/title from the document (or create one if none exists)
2. Copy the exact bullet points or content from that section
3. Create a brief audio narration script (2-3 sentences) that reads the content naturally

Also generate 10 quiz questions based on the EXACT content in the document. Questions should:
1. Test specific facts, terms, or procedures mentioned in the document
2. Have 4 options (A, B, C, D)
3. Have one correct answer based on the document content

Respond in this exact JSON format:
{
  "slides": [
    {
      "slide_number": 1,
      "title": "Original Section Title",
      "key_points": ["Exact point 1 from document", "Exact point 2 from document", "Exact point 3 from document"],
      "audio_script": "Brief narration summarizing this slide..."
    }
  ],
  "questions": [
    {
      "question_text": "Question testing specific content from the document?",
      "options": ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
      "correct_answer": "A",
      "points": 1
    }
  ]
}

Create one slide per page/section in the document, and exactly 10 quiz questions.`;

  } else {
    // Smart Transform: AI restructures and optimizes content
    prompt = `You are analyzing an uploaded PDF document to create an optimized training module.

Training Module Details:
- Title: ${title || 'Training Module'}
- Competency: ${competency?.name || 'General Training'}
- Target Level: ${targetLevel} (1=Awareness, 2=Knowledge, 3=Practitioner, 4=Proficient, 5=Expert)
- Language: ${language || 'English'}

Please analyze the document and TRANSFORM it into effective training content:

1. Restructure the content for optimal learning flow
2. Break complex topics into digestible slides
3. Rewrite bullet points for clarity and impact
4. Add context and explanations where helpful
5. Organize content from foundational to advanced concepts

For each slide you create, provide:
1. A clear, engaging title
2. 3-4 key learning points (concise, actionable)
3. An audio narration script (2-3 sentences explaining the concepts)

Also generate 10 quiz questions that test understanding at the target competency level. Each question should:
1. Test comprehension, not just memorization
2. Have 4 options (A, B, C, D)
3. Have one correct answer
4. Progress from basic to more challenging

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

Create 6-10 well-structured slides, and exactly 10 quiz questions.`;
  }

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
                media_type: 'application/pdf',
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
