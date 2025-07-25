const express = require('express');
const { Client, GatewayIntentBits, Partials, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const upload = multer();

const app = express();
app.use(express.json());
app.use(upload.single('tokenfile')); // For file uploads

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DATABASE_CHANNEL_ID = '1398279525208424539'; // your private storage channel

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

client.once('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);

// ---- GET PFP ----
app.get('/pfp', async (req, res) => {
  const userId = req.query.id;
  if (!userId) return res.status(400).send('Missing user ID');
  try {
    const user = await client.users.fetch(userId);
    return res.send(user.displayAvatarURL({ dynamic: true, size: 1024 }));
  } catch (error) {
    console.error('Error fetching pfp:', error);
    return res.status(500).send('Failed to get avatar');
  }
});

// ---- POST Chat Log ----
app.post('/chatlog', async (req, res) => {
  const channelId = req.query.channelId;
  let limit = parseInt(req.query.limit, 10);
  if (!channelId) return res.status(400).send('Missing channelId');

  limit = isNaN(limit) ? 10 : Math.max(1, Math.min(limit, 100));

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return res.status(404).send('Invalid channel');

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
    console.error('Chatlog error:', err);
    return res.status(500).send('Failed to fetch chat log');
  }
});

// ---- POST Register/Login ----
app.post('/register', async (req, res) => {
  const { username, token } = req.body;
  if (!username || !token) return res.status(400).send('Missing username or token');

  try {
    const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const messages = await dbChannel.messages.fetch({ limit: 100 });

    const found = messages.find(msg => msg.content.includes(`Username: ${username}`));
    if (found) return res.status(409).send('Username already registered');

    await dbChannel.send(`Username: ${username}\nToken: ${token}`);
    return res.send('User registered');
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).send('Registration failed');
  }
});

app.post('/login', async (req, res) => {
  const { username } = req.body;
  const file = req.file;

  if (!username || !file) return res.status(400).send('Missing username or token file');

  const tokenFromFile = file.buffer.toString().trim();

  try {
    const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const messages = await dbChannel.messages.fetch({ limit: 100 });

    const userMessage = messages.find(msg =>
      msg.content.includes(`Username: ${username}`) &&
      msg.content.includes(`Token: ${tokenFromFile}`)
    );

    if (userMessage) {
      return res.send('Login successful');
    } else {
      return res.status(401).send('Invalid credentials');
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).send('Login failed');
  }
});

// ---- Start server ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
});
