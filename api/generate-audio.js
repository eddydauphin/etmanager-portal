// Vercel Serverless Function for ElevenLabs Text-to-Speech
// File: api/generate-audio.js

export default async function handler(req, res) {
  // Handle CORS
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
    const { text, language = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    // Voice IDs for different languages
    // Using ElevenLabs multilingual voices
    const voiceMap = {
      'en': 'EXAVITQu4vr4xnSDxMaL', // Sarah - American English
      'fr': 'pFZP5JQG7iQjIQuC4Bku', // Lily - French
      'es': 'Xb7hH8MSUJpSbSDYk0k2', // Alice - Spanish  
      'et': 'EXAVITQu4vr4xnSDxMaL'  // Fallback to English for Estonian
    };

    const voiceId = voiceMap[language] || voiceMap['en'];

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', errorText);
      return res.status(response.status).json({ 
        error: 'ElevenLabs API error', 
        details: errorText 
      });
    }

    // Get audio as buffer and convert to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({ 
      audio: base64Audio,
      contentType: 'audio/mpeg'
    });

  } catch (error) {
    console.error('Error generating audio:', error);
    return res.status(500).json({ error: 'Failed to generate audio', details: error.message });
  }
}
