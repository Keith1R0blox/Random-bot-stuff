const express = require('express');
const multer = require('multer');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const crypto = require('crypto');

// === Setup Express ===
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer();

// === Discord Setup ===
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DATABASE_CHANNEL_ID = '1398279525208424539'; // Your private database channel

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

// === Helper Function: Generate Token ===
function generateToken(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

// === SIGNUP Endpoint ===
app.post('/signup', async (req, res) => {
  const username = req.body.username;

  if (!username) {
    return res.status(400).send('Missing username');
  }

  try {
    const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    if (!dbChannel?.isTextBased()) {
      return res.status(500).send('Database channel not found');
    }

    // Check for existing user
    const messages = await dbChannel.messages.fetch({ limit: 100 });
    const userExists = messages.some(msg => msg.content.startsWith(`Username: ${username}\n`));

    if (userExists) {
      return res.status(400).send('Username already registered');
    }

    const token = generateToken(8); // 16 hex chars
    await dbChannel.send(`Username: ${username}\nToken: ${token}`);
    return res.status(200).json({ username, token });

  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).send('Internal server error');
  }
});

// === LOGIN Endpoint ===
app.post('/login', upload.single('file'), async (req, res) => {
  const username = req.body.username;
  const tokenFromFile = req.file?.buffer?.toString().trim();

  if (!username || !tokenFromFile) {
    return res.status(400).send('Missing username or token file');
  }

  try {
    const dbChannel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const messages = await dbChannel.messages.fetch({ limit: 100 });

    const matched = messages.find(msg =>
      msg.content.startsWith(`Username: ${username}\n`) &&
      msg.content.includes(`Token: ${tokenFromFile}`)
    );

    if (!matched) {
      return res.status(401).send('Invalid credentials');
    }

    return res.status(200).send('Login successful!');
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).send('Internal error');
  }
});

// === Start Server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});
