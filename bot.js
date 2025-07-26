const express = require('express');
const multer = require('multer');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const upload = multer();
const app = express();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 3000;
const DATABASE_CHANNEL_ID = '1398279525208424539';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
  console.log(`🤖 Bot is online as ${client.user.tag}`);
});

// LOGIN BOT
client.login(DISCORD_TOKEN);

// PFP ENDPOINT
app.get('/pfp', async (req, res) => {
  const userId = req.query.id;
  if (!userId) return res.status(400).send('Missing user ID');
  try {
    const user = await client.users.fetch(userId);
    return res.send(user.displayAvatarURL({ dynamic: true, size: 1024 }));
  } catch {
    return res.status(404).send('User not found');
  }
});

// CHATLOG ENDPOINT
app.post('/chatlog', async (req, res) => {
  const { channelId, limit } = req.body;
  if (!channelId) return res.status(400).send('Missing channelId');
  const msgLimit = parseInt(limit) || 10;

  try {
    const channel = await client.channels.fetch(channelId);
    const messages = await channel.messages.fetch({ limit: msgLimit });
    const output = messages.map(m => `[${m.author.username}] ${m.content}`).reverse().join('\n');
    return res.send(output);
  } catch {
    return res.status(500).send('Failed to fetch messages');
  }
});

// SIGNUP ENDPOINT
app.post('/signup', async (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).send('Missing username');

  const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
  const messages = await dbChannel.messages.fetch({ limit: 100 });
  const exists = messages.find(m => m.content.includes(`Username: ${username}`));

  if (exists) return res.status(400).send('Username already exists');

  const token = Math.random().toString(36).substring(2, 12);
  await dbChannel.send(`Username: ${username}\nToken: ${token}`);
  return res.send({ username, token });
});

// LOGIN ENDPOINT
app.post('/login', upload.single('token'), async (req, res) => {
  const username = req.body.username;
  const token = req.file ? req.file.buffer.toString().trim() : req.body.token;
  if (!username || !token) return res.status(400).send('Missing username or token');

  const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
  const messages = await dbChannel.messages.fetch({ limit: 100 });
  const match = messages.find(m =>
    m.content.includes(`Username: ${username}`) && m.content.includes(`Token: ${token}`)
  );

  if (!match) return res.status(401).send('Invalid credentials');
  return res.send('Login successful');
});

// SECURE SEND MESSAGE ENDPOINT
app.post('/send', async (req, res) => {
  const { username, token, channelId, message } = req.body;
  if (!username || !token || !channelId || !message)
    return res.status(400).send('Missing required fields');

  const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
  const messages = await dbChannel.messages.fetch({ limit: 100 });
  const match = messages.find(m =>
    m.content.includes(`Username: ${username}`) && m.content.includes(`Token: ${token}`)
  );

  if (!match) return res.status(401).send('Invalid credentials');

  try {
    const targetChannel = await client.channels.fetch(channelId);
    await targetChannel.send(message);
    return res.send('Message sent!');
  } catch {
    return res.status(500).send('Failed to send message');
  }
});

// START EXPRESS SERVER
app.listen(PORT, () => {
  console.log(`🌐 Web server running on http://localhost:${PORT}`);
});
