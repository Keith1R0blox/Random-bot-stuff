const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
const upload = multer();
app.use(express.json());

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DATABASE_CHANNEL_ID = '1398279525208424539';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel]
});

client.once('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);

// Generate a random token
function generateToken(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

// === PFP endpoint ===
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

// === CHATLOG endpoint ===
app.post('/chatlog', async (req, res) => {
  const channelId = req.query.channelId;
  let limit = parseInt(req.query.limit) || 10;
  limit = Math.min(Math.max(limit, 1), 100);

  if (!channelId) return res.status(400).send('Missing channelId');

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return res.status(404).send('Invalid channel');

    const messages = await channel.messages.fetch({ limit });
    const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const log = sorted.map(msg => {
      const time = new Date(msg.createdTimestamp).toLocaleString();
      const user = msg.author?.username || 'Unknown';
      const content = msg.cleanContent || '[No content]';
      return `[${time}] ${user}: ${content}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/plain');
    return res.send(log);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error fetching chat log');
  }
});

// === SIGNUP endpoint ===
app.post('/signup', async (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).send('Missing username');

  try {
    const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const msgs = await dbChannel.messages.fetch({ limit: 100 });
    const exists = msgs.find(m => m.content.includes(`Username: ${username}\nToken:`));

    if (exists) return res.status(409).send('Username already exists');

    const token = generateToken(8);
    await dbChannel.send(`Username: ${username}\nToken: ${token}`);
    return res.json({ username, token });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Signup error');
  }
});

// === LOGIN endpoint ===
app.post('/login', upload.single('token'), async (req, res) => {
  const username = req.body.username;
  const token = req.file?.buffer?.toString().trim();

  if (!username || !token) return res.status(400).send('Missing username or token');

  try {
    const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const msgs = await dbChannel.messages.fetch({ limit: 100 });
    const matched = msgs.find(m => m.content.includes(`Username: ${username}\nToken: ${token}`));

    if (!matched) return res.status(403).send('Invalid credentials');
    return res.send('Login successful');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Login error');
  }
});

// === Start server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running at http://localhost:${PORT}`);
});
