import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function runMainAgent() {
  console.log("🤖 Running Main Agent...");

  const prompt = `
  Generate a short AI-powered sports recap for KEYAM SPORTS.
  Include trending updates about NBA, MLB, NFL, or Soccer.
  Format like this:
  ---
  🏆 Headline: [title]
  📰 Recap: [2 short paragraphs]
  📊 Key Stat: [stat highlight]
  `;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const output = response.choices[0].message?.content || "No output";

  // Save output as a simple text file (for now)
  fs.writeFileSync("latest_agent_post.txt", output);

  console.log("✅ AI content generated and saved!");
  console.log(output);
}

// For manual testing:
runMainAgent();
