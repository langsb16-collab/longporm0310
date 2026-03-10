import { GoogleGenAI, Type, Modality } from "@google/genai";

// Get API key from environment or localStorage
const getApiKey = () => {
  // Try environment variable first (for Cloudflare Pages)
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);
  if (envKey) return envKey;
  
  // Try localStorage
  const storedKey = localStorage.getItem('gemini_api_key');
  if (storedKey) return storedKey;
  
  // Prompt user for API key
  const userKey = prompt('Please enter your Google Gemini API Key:\n\n(You can get one from https://aistudio.google.com/apikey)\n\nYour key will be saved in this browser.');
  if (userKey) {
    localStorage.setItem('gemini_api_key', userKey);
    return userKey;
  }
  
  throw new Error('Gemini API key is required. Please set VITE_GEMINI_API_KEY environment variable or enter it when prompted.');
};

const apiKey = getApiKey();

export const generateScript = async (topic: string, duration: number, showSource: boolean) => {
  const ai = new GoogleGenAI({ apiKey });
  const sourceInstruction = showSource 
    ? "Include a section at the end citing news and data sources." 
    : "Do not explicitly mention sources in the script.";

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Write a professional YouTube long-form video script.
      Topic: ${topic}
      Target Duration: ${duration} minutes.
      Requirements:
      1. Engaging Intro (Hook)
      2. Detailed Body with clear sections
      3. Conclusion and Call to Action (CTA)
      4. ${sourceInstruction}
      Format the output as a clean script with [Scene] markers.`,
    config: {
      temperature: 0.7,
    }
  });

  return response.text;
};

export const generateThumbnailPrompt = async (script: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on this script, generate a highly engaging, clickbait-style image generation prompt for a YouTube thumbnail.
      Script: ${script.substring(0, 2000)}
      Focus on high contrast, bold elements, and emotional impact.`,
  });
  return response.text;
};

export const generateImage = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateAudio = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text.substring(0, 1000) }] }], // Limit for demo
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/mp3;base64,${base64Audio}`;
  }
  return null;
};

export const analyzeComments = async (comments: string[]) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze these YouTube comments and suggest 3 future video topics based on viewer requests and sentiment.
      Comments: ${comments.join("\n")}
      Return the result in JSON format with properties: sentiment (overall), suggestions (array of strings).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING },
          suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getTrendingTopics = async () => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 5 currently trending or high-potential YouTube topics for 2026 in the tech and lifestyle niche.
      For each topic, provide:
      1. Topic name
      2. Estimated growth percentage (e.g., "+150%")
      3. A brief reason why it's trending.
      Return the result in JSON format as an array of objects with properties: topic, growth, reason.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            growth: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["topic", "growth", "reason"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const translateMessage = async (text: string, targetLang: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following text to ${targetLang}. Return only the translated text.
      Text: ${text}`,
  });
  return response.text;
};
