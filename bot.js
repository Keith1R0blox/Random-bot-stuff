const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
app.use(express.json());

// Replace with your actual bot token
const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // Or use process.env.DISCORD_TOKEN

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

// GET /pfp?id=USER_ID
app.get('/pfp', async (req, res) => {
  const userId = req.query.id;
  if (!userId) return res.status(400).send('Missing user ID');

  try {
    const user = await client.users.fetch(userId);
    return res.send(user.displayAvatarURL({ dynamic: true, size: 1024 }));
  } catch (err) {
    console.error('Failed to fetch user:', err);
    return res.status(500).send('Failed to fetch avatar');
  }
});

// POST /chatlog?channelId=CHANNEL_ID&limit=NUMBER
app.post('/chatlog', async (req, res) => {
  const channelId = req.query.channelId;
  let limit = parseInt(req.query.limit, 10);

  if (!channelId) return res.status(400).send('Missing channelId');
  if (isNaN(limit)) limit = 10;
  limit = Math.max(1, Math.min(limit, 100)); // Clamp between 1 and 100

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      return res.status(404).send('Channel not found or not text-based');
    }

    const messages = await channel.messages.fetch({ limit });
    const sorted = [...messages.values()].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    const log = sorted.map(msg => {
      const time = new Date(msg.createdTimestamp).toLocaleString();
      const author = msg.author?.username || 'Unknown';
      const content = msg.cleanContent || '[No content]';
      return `[${time}] ${author}: ${content}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.send(log);
  } catch (err) {
    console.error('Error fetching chat log:', err);
    return res.status(500).send('Failed to fetch messages');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server is running at http://localhost:${PORT}`);
});
