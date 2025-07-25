const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

const app = express();
app.use(express.json());

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

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

// Helper: fetch exactly `n` messages using pagination
async function fetchMessagesExact(channel, limit) {
  const out = [];
  let lastId;

  while (out.length < limit) {
    const options = { limit: Math.min(100, limit - out.length) };
    if (lastId) options.before = lastId;

    const fetched = await channel.messages.fetch(options);
    if (fetched.size === 0) break;

    const arr = [...fetched.values()];
    out.push(...arr);
    lastId = arr[arr.length - 1].id;

    if (fetched.size < options.limit) break;
  }

  return out;
}

app.post('/chatlog', async (req, res) => {
  const channelId = req.query.channelId;
  let limit = parseInt(req.query.limit, 10);

  if (!channelId) return res.status(400).send('Missing channelId');

  if (isNaN(limit)) limit = 10;
  limit = Math.max(1, Math.min(limit, 100));

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return res.status(404).send('Not a text channel');

    const messages = await fetchMessagesExact(channel, limit);
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
    console.error('❌ Error fetching chat log:', err);
    return res.status(500).send('Error fetching chat log');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server on port ${PORT}`));
