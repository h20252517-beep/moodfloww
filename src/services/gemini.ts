import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface RecommendationResult {
  path: {
    emotion: string;
    description: string;
    songs: {
      title: string;
      artist: string;
      reason: string;
    }[];
  }[];
  advice: string;
}

export async function analyzeDiary(text: string) {
  if (!text.trim()) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `사용자의 오늘 있었던 일: "${text}"\n이 글을 바탕으로 사용자의 현재 감정을 'depressed', 'stressed', 'lethargic', 'calm', 'happy' 중 하나로 분석해서 해당 영단어만 반환해줘.`,
    });
    const result = response.text?.trim().toLowerCase();
    const valid = ['depressed', 'stressed', 'lethargic', 'calm', 'happy'];
    return valid.includes(result || "") ? result : null;
  } catch (error) {
    console.error("Diary analysis error:", error);
    return null;
  }
}

export async function getDetailedRecommendations(
  current: string,
  target: string,
  intensity: number,
  reason: string,
  diary?: string
): Promise<RecommendationResult | null> {
  const prompt = `
    현재 감정: ${current} (강도: ${intensity}/5)
    목표 감정: ${target}
    감정의 이유: ${reason}
    ${diary ? `오늘 있었던 일: ${diary}` : ""}

    위 정보를 바탕으로 현재 감정에서 목표 감정으로 변화해가는 2~3단계의 음악 추천 경로를 생성해줘.
    각 단계마다 2곡씩 추천해주고, 추천 이유는 아주 자연스럽고 다정한 사람의 말투로 작성해줘.
    또한, 지금 사용자의 상태에서 더 나아질 수 있는 짧은 조언(예: "지금은 바로 신나는 음악보다 차분한 음악으로 시작하는게 좋아요")도 한 문장 포함해줘.

    반드시 JSON 형식으로 응답해:
    {
      "path": [
        {
          "emotion": "감정레이블",
          "description": "이 단계의 감정 설명",
          "songs": [
            { "title": "제목", "artist": "아티스트", "reason": "다정한 추천 이유" }
          ]
        }
      ],
      "advice": "사용자를 위한 조언"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  emotion: { type: Type.STRING },
                  description: { type: Type.STRING },
                  songs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        artist: { type: Type.STRING },
                        reason: { type: Type.STRING },
                      },
                      required: ["title", "artist", "reason"],
                    },
                  },
                },
                required: ["emotion", "description", "songs"],
              },
            },
            advice: { type: Type.STRING },
          },
          required: ["path", "advice"],
        },
      },
    });

    return JSON.parse(response.text || "{}") as RecommendationResult;
  } catch (error) {
    console.error("Gemini recommendation error:", error);
    return null;
  }
}
