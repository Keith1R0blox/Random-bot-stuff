const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
const upload = multer({ dest: 'uploads/' });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DATABASE_CHANNEL_ID = '1398279525208424539';

// Discord bot setup
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

// Helper to find username message
async function findUserEntry(channel, username) {
  const messages = await channel.messages.fetch({ limit: 100 });
  return messages.find(msg =>
    msg.content.startsWith(`Username: ${username}\nToken:`)
  );
}

// ========== SIGNUP ==========
app.post('/signup', async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).send('Missing username');

  try {
    const channel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const existing = await findUserEntry(channel, username);
    if (existing) return res.status(400).send('Username already exists');

    const token = Math.random().toString(36).substring(2, 10);
    await channel.send(`Username: ${username}\nToken: ${token}`);
    res.send(`✅ Account created!\nUsername: ${username}\nToken: ${token}`);
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).send('Internal server error');
  }
});

// ========== LOGIN ==========
app.post('/login', upload.single('tokenFile'), async (req, res) => {
  const username = req.query.username;
  if (!username || !req.file) {
    return res.status(400).send('Missing username or token file');
  }

  try {
    const channel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const userMsg = await findUserEntry(channel, username);
    if (!userMsg) return res.status(404).send('User not found');

    const expectedToken = userMsg.content.split('Token: ')[1].trim();
    const fileToken = fs.readFileSync(req.file.path, 'utf8').trim();

    // Delete uploaded file after reading
    fs.unlinkSync(req.file.path);

    if (fileToken === expectedToken) {
      return res.send('✅ Login successful');
    } else {
      return res.status(401).send('❌ Invalid token');
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Internal server error');
  }
});

// OPTIONAL: MESSAGE SENDER
app.post('/send-message', async (req, res) => {
  const { channelId, message } = req.query;
  if (!channelId || !message) return res.status(400).send('Missing channelId or message');

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return res.status(400).send('Invalid text channel');

    await channel.send(message);
    res.send('✅ Message sent!');
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).send('Internal server error');
  }
});

// Start web server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Server running on port ${PORT}`));
