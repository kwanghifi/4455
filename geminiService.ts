
import { GoogleGenAI } from "@google/genai";

export async function identifyModelFromImage(base64Image: string): Promise<string | null> {
  // ดึง API Key จาก process.env โดยตรง
  // ใน Netlify ผู้ใช้ต้องตั้งค่า Environment Variable ชื่อ API_KEY ใน Site Settings
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error("Gemini API Key is missing. Please set 'API_KEY' in your Netlify Environment Variables.");
    return null;
  }
  
  try {
    // สร้าง instance ใหม่ทุกครั้งตามแนวทางปฏิบัติที่ดีที่สุดสำหรับ API key แบบฉีด
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: "Identify the CD PLAYER brand and model number from this image. Look for text on the front panel (e.g., Sony CDP-227ESD, Denon DCD-1500, Technics SL-P1200, Marantz CD-63, Pioneer PD-73). Return ONLY the brand and model number as a plain string. If no model is found, return 'NOT_FOUND'.",
          },
        ],
      },
    });

    const result = response.text?.trim();
    
    if (!result || result === 'NOT_FOUND') {
      return null;
    }

    // กรองผลลัพธ์เบื้องต้นเพื่อให้แน่ใจว่าได้ชื่อรุ่น ไม่ใช่แค่ชื่อยี่ห้อ
    return result;
  } catch (error) {
    console.error("Gemini Vision API Error:", error);
    return null;
  }
}
