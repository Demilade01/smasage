import readline from "readline";

const SYSTEM_PROMPT = `You are Smasage, an intelligent financial assistant.
You help users read balances and project financial goals on the Stellar network.`;

const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY is not set in your .env file.");
  process.exit(1);
}

async function chat(userMessage, history = []) {
  const messages = [
    ...history,
    { role: "user", content: userMessage }
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} — ${err}`);
  }

  const dat= await res.json();
  return data.content[0].text;
}

async function main() {
  console.log("Smasage agent started. Type your message or 'exit' to quit.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const history = [];

  const ask = () => {
    rl.question("You: ", async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed.toLowerCase() === "exit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      try {
        const reply = await chat(trimmed, history);
        history.push({ role: "user", content: trimmed });
        history.push({ role: "assistant", content: reply });
        console.log(`\nSmasage: ${reply}\n`);
      } catch (err) {
        console.error("Error:", err.message);
      }

      ask();
    });
  };

  ask();
}

main();
