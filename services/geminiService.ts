
import { GoogleGenAI, Type } from "@google/genai";

// Use gemini-3-flash-preview for simple text tasks like OCR
export const extractTextFromImage = async (base64Snippet: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Snippet.split(',')[1] || base64Snippet
          }
        }]
      },
      config: {
        systemInstruction: "You are a high-speed OCR engine. Extract only the visible text and numbers from the image. Maintain line breaks. No conversation. No explanations.",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text?.trim() || null;
  } catch (error) {
    console.error("Gemini OCR error:", error);
    return null;
  }
};

// Use gemini-3-flash-preview for image analysis and tool suggestions
export const analyzeReceivedImage = async (base64Image: string): Promise<{summary: string, suggestion: string} | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{
          inlineData: {
            mimeType: 'image/png',
            data: base64Image.split(',')[1] || base64Image
          }
        }, {
          text: "Briefly describe this image in 10 words and suggest which creative tool to use: 'upscale' (if blurry), 'bg-eraser' (if it has a clear subject), or 'collage' (if it's a photo). Return JSON."
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            suggestion: { type: Type.STRING, enum: ['upscale', 'bg-eraser', 'collage'] }
          },
          required: ['summary', 'suggestion']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
  } catch (err) {
    console.error("Analysis error:", err);
  }
  return null;
};

// Use gemini-2.5-flash-image for background removal and upscaling (editing tasks)
export const processImageEditing = async (base64Image: string, prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: 'image/png'
            }
          },
          { text: prompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Editing error:", error);
    return null;
  }
};

// Use gemini-3-pro-preview for complex reasoning tasks like layout suggestion
export const suggestLayout = async (imageCount: number, orientation: 'portrait' | 'landscape'): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Suggest a creative A4 ${orientation} collage layout for ${imageCount} images. 
      Return an array of objects with normalized coordinates (0-1) for x, y, width, height.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              width: { type: Type.NUMBER },
              height: { type: Type.NUMBER }
            },
            required: ['x', 'y', 'width', 'height']
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
  } catch (error) {
    console.error("Gemini layout error:", error);
  }
  return null;
};
