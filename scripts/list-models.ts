import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY not set");
  process.exit(1);
}

const client = new OpenAI({ apiKey });
const list = await client.models.list();
const ids = list.data
  .map((m) => m.id)
  .filter((id) => id.startsWith("gpt-") || id.startsWith("o") || id.startsWith("chatgpt"))
  .sort();

console.log("Chat-capable models on your account:");
for (const id of ids) console.log(`  ${id}`);
