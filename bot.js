const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
app.use(express.json());

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.once('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);

// Endpoint to fetch chat log
// Usage: POST /chatlog?channelId=...&limit=10
app.post('/chatlog', async (req, res) => {
  const channelId = req.query.channelId;

  if (!channelId) {
    return res.status(400).send('Missing channelId');
  }

  // Parse and validate limit
  let limit = parseInt(req.query.limit, 10);
  if (isNaN(limit)) {
    limit = 10;
  } else {
    limit = Math.max(1, Math.min(limit, 100)); // Clamp between 1 and 100
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      return res.status(404).send('Channel not found or not text-based');
    }

    const messages = await channel.messages.fetch({ limit });
    const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const log = sorted.map(msg => {
      const time = new Date(msg.createdTimestamp).toLocaleString();
      const author = msg.author?.username || 'Unknown';
      const content = msg.cleanContent || '[No content]';
      return `[${time}] ${author}: ${content}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/plain');
    return res.send(log);

  } catch (err) {
    console.error('Error fetching chat log:', err);
    return res.status(500).send('Error fetching chat log');
  }
});

// Start the web server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running at http://localhost:${PORT}`);
});
