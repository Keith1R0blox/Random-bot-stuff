const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');

const app = express();
const upload = multer();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PRIVATE_DB_CHANNEL_ID = '1398279525208424539';
const WEBHOOK_URL = process.env.WEBHOOK_URL;

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});
client.login(DISCORD_TOKEN);

// /pfp?id=...
app.get('/pfp', async (req, res) => {
  const userId = req.query.id;
  if (!userId) return res.status(400).send('Missing user ID');
  try {
    const user = await client.users.fetch(userId);
    return res.send(user.displayAvatarURL({ dynamic: true, size: 1024 }));
  } catch {
    return res.status(500).send('Error fetching avatar');
  }
});

// /chatlog?channelId=...&limit=...
app.post('/chatlog', async (req, res) => {
  const channelId = req.query.channelId;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const channel = await client.channels.fetch(channelId);
    const messages = await channel.messages.fetch({ limit });
    const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const log = sorted.map(m => {
      const time = new Date(m.createdTimestamp).toLocaleString();
      const author = m.author?.username || 'Unknown';
      const content = m.cleanContent || '[No content]';
      return `[${time}] ${author}: ${content}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.send(log);
  } catch {
    res.status(500).send('Error fetching chat log');
  }
});

// /signup
app.post('/signup', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).send('Missing username');

  const dbChannel = await client.channels.fetch(PRIVATE_DB_CHANNEL_ID);
  const messages = await dbChannel.messages.fetch({ limit: 100 });

  const exists = messages.some(m => m.content.startsWith(`Username: ${username}\n`));
  if (exists) return res.status(400).send('Username already exists');

  const token = Math.random().toString(36).slice(2, 10);
  await dbChannel.send(`Username: ${username}\nToken: ${token}`);
  res.send(`Your token is: ${token}`);
});

// /login
app.post('/login', upload.single('token'), async (req, res) => {
  const { username } = req.body;
  let token = req.body.token;

  if (req.file && !token) token = req.file.buffer.toString().trim();
  if (!username || !token) return res.status(400).send('Missing username or token');

  const dbChannel = await client.channels.fetch(PRIVATE_DB_CHANNEL_ID);
  const messages = await dbChannel.messages.fetch({ limit: 100 });

  const found = messages.find(m =>
    m.content.includes(`Username: ${username}\n`) &&
    m.content.includes(`Token: ${token}`)
  );

  if (!found) return res.status(403).send('Invalid credentials');
  res.send('Login successful');
});

// /send (requires username + token)
app.post('/send', upload.single('token'), async (req, res) => {
  const { username, content, avatar } = req.body;
  let token = req.body.token;
  if (req.file && !token) token = req.file.buffer.toString().trim();

  if (!username || !token || !content)
    return res.status(400).send('Missing username, token, or content');

  const dbChannel = await client.channels.fetch(PRIVATE_DB_CHANNEL_ID);
  const messages = await dbChannel.messages.fetch({ limit: 100 });

  const isValid = messages.find(m =>
    m.content.includes(`Username: ${username}\n`) &&
    m.content.includes(`Token: ${token}`)
  );

  if (!isValid) return res.status(403).send('Invalid credentials');

  try {
    await axios.post(WEBHOOK_URL, {
      username: username,
      avatar_url: avatar || undefined,
      content: content
    });
    res.send('Message sent successfully');
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).send('Error sending message');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
});
