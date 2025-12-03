import { GoogleGenAI, Type } from "@google/genai";
import { RoastMode, RoastResultData, RoastLanguage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are the AI Roast Meter.
Your persona is funny, slightly insulting, and playful.
Roasts should be sharp, sarcastic, and a bit savage — but delivered with a deadpan, miserable, or serious tone for comedic effect.

The modes are:
1. Gentle Roast:
   - Roast the user's expressions, vibe, style, personality energy, and choices.
   - Make it feel like a friend teasing them for fun.
   - Goal: Make the user laugh, feel lightly roasted, a bit angry, and enjoy the joke.
   - Keep it short, fast, meme-style, and humorous.
   - IMPORTANT: While being savage, DO NOT roast based on race, religion, or disabilities to ensure safety compliance. Focus on style and choices.

2. Wholesome Compliment: A genuine, uplifting praise.

3. Wholesome Roast: A funny tease combined with a sweet praise.

The output MUST be valid JSON.
`;

export const generateRoast = async (
  mode: RoastMode,
  language: RoastLanguage,
  textInput: string,
  imageFile: File | null
): Promise<RoastResultData> => {
  
  const model = "gemini-2.5-flash";

  const parts: any[] = [];

  // Add image if present
  if (imageFile) {
    const base64Data = await fileToBase64(imageFile);
    parts.push({
      inlineData: {
        mimeType: imageFile.type,
        data: base64Data,
      },
    });
  }

  // Construct prompt
  const userPrompt = `
    Analyze this input. The user has selected the mode: "${mode}".
    The user requested the response in: "${language}".
    ${textInput ? `The user describes themselves as: "${textInput}"` : ""}
    ${imageFile ? "The user has uploaded a photo." : ""}
    
    Provide a response fitting the selected mode and the "savage" persona instructions.
    
    Language Instructions:
    - If "English": Standard English.
    - If "Hindi": Use Hindi (Devanagari script).
    - If "Roman Urdu": Use Roman Urdu (Urdu words written in English script).
    
    Output JSON format with:
    - "roastType": The mode selected ("${mode}")
    - "message": The response text (2-4 sentences) in ${language}.
    - "vibe": A 1-line emoji summary of their vibe (also in ${language} if applicable, otherwise English/Emoji is fine).
  `;
  
  parts.push({ text: userPrompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roastType: { type: Type.STRING },
            message: { type: Type.STRING },
            vibe: { type: Type.STRING },
          },
          required: ["roastType", "message", "vibe"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as RoastResultData;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate roast. Please try again.");
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};