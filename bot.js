const express = require('express');
const multer = require('multer');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer();

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
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);

// Generate a secure random token
function generateToken(length = 8) {
  return crypto.randomBytes(length).toString('hex');
}

// ========== /signup ==========
app.post('/signup', async (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).send('Missing username');

  try {
    const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    if (!dbChannel?.isTextBased()) return res.status(500).send('Invalid DB channel');

    const messages = await dbChannel.messages.fetch({ limit: 100 });
    const exists = messages.some(msg => msg.content.startsWith(`Username: ${username}\n`));
    if (exists) return res.status(400).send('Username already registered');

    const token = generateToken(8);
    await dbChannel.send(`Username: ${username}\nToken: ${token}`);
    return res.json({ username, token });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error during signup');
  }
});

// ========== /login ==========
app.post('/login', upload.single('file'), async (req, res) => {
  const username = req.body.username;
  const token = req.file?.buffer?.toString().trim();

  if (!username || !token) return res.status(400).send('Missing username or token');

  try {
    const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const messages = await dbChannel.messages.fetch({ limit: 100 });

    const match = messages.find(msg =>
      msg.content.startsWith(`Username: ${username}\n`) &&
      msg.content.includes(`Token: ${token}`)
    );

    if (!match) return res.status(401).send('Invalid credentials');
    return res.send('Login successful');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error during login');
  }
});

// ========== /chatlog ==========
app.get('/chatlog', async (req, res) => {
  const channelId = req.query.channelId;
  const limit = parseInt(req.query.limit) || 10;

  if (!channelId) return res.status(400).send('Missing channelId');

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return res.status(400).send('Invalid channel');

    const messages = await channel.messages.fetch({ limit });
    const formatted = messages
      .map(m => `${m.author.tag}: ${m.content}`)
      .reverse();

    return res.json({ messages: formatted });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error fetching messages');
  }
});

// ========== /pfp ==========
app.get('/pfp', async (req, res) => {
  const userId = req.query.id;
  if (!userId) return res.status(400).send('Missing user ID');

  try {
    const user = await client.users.fetch(userId);
    if (!user) return res.status(404).send('User not found');

    const avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });
    return res.send(avatarURL);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error fetching user');
  }
});

// ========== Start Server ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server listening on port ${PORT}`);
});
