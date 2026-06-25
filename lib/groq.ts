import Groq from "groq-sdk";

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is not set. Please add it to your .env.local file. Get a free key at https://console.groq.com"
      );
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function callGroq(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096,
  temperature = 0.2
): Promise<string> {
  const client = getGroqClient();

  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Groq");
  return content;
}

export async function callGroqText(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2048,
  temperature = 0.3
): Promise<string> {
  const client = getGroqClient();

  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Groq");
  return content;
}
