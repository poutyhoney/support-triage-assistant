import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic();

const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: "In one sentence, what is the HTTP request/response cycle?",
    },
  ],
});

console.log(message.content[0].text);