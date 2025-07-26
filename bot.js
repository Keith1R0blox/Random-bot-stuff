const express = require('express');
const multer = require('multer');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const crypto = require('crypto');

const app = express();
const upload = multer();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DATABASE_CHANNEL_ID = '1398279525208424539';

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

// ✅ GET profile picture
app.get('/pfp', async (req, res) => {
  const userId = req.query.id;
  if (!userId) return res.status(400).send('Missing user ID');

  try {
    const user = await client.users.fetch(userId);
    res.send(user.displayAvatarURL({ dynamic: true, size: 1024 }));
  } catch {
    res.status(404).send('User not found');
  }
});

// ✅ POST chat log
app.post('/chatlog', async (req, res) => {
  const channelId = req.query.channelId;
  let limit = parseInt(req.query.limit, 10);
  if (!channelId) return res.status(400).send('Missing channelId');
  if (isNaN(limit)) limit = 10;
  limit = Math.min(Math.max(limit, 1), 100);

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return res.status(404).send('Invalid channel');

    const messages = await channel.messages.fetch({ limit });
    const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const log = sorted.map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author?.username || 'Unknown'}: ${m.cleanContent || '[No content]'}`).join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.send(log);
  } catch (err) {
    console.error('Chat log error:', err);
    res.status(500).send('Error fetching chat log');
  }
});

// ✅ POST signup
app.post('/signup', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).send('Missing username');

  try {
    const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const messages = await dbChannel.messages.fetch({ limit: 100 });
    const exists = messages.some(msg => msg.content.startsWith(`Username: ${username}\n`));
    if (exists) return res.status(409).send('Username already exists');

    const token = crypto.randomBytes(12).toString('hex');
    await dbChannel.send(`Username: ${username}\nToken: ${token}`);
    res.json({ username, token });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).send('Signup failed');
  }
});

// ✅ POST login (supports file or text)
app.post('/login', upload.single('tokenFile'), async (req, res) => {
  const { username, token } = req.body;
  const fileToken = req.file ? req.file.buffer.toString('utf-8').trim() : null;

  if (!username) return res.status(400).send('Missing username');
  const tokenToCheck = (fileToken || token || '').trim();
  if (!tokenToCheck) return res.status(400).send('Missing token');

  try {
    const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const messages = await dbChannel.messages.fetch({ limit: 100 });
    const match = messages.find(msg =>
      msg.content.startsWith(`Username: ${username}\nToken: `) &&
      msg.content.trim() === `Username: ${username}\nToken: ${tokenToCheck}`
    );

    if (!match) return res.status(401).send('Invalid credentials');
    res.send(`✅ Logged in as ${username}`);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Login failed');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server ready at http://localhost:${PORT}`);
});
