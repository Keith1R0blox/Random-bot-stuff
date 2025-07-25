const express = require('express');
const multer = require('multer');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const app = express();
const upload = multer({ dest: 'uploads/' });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DATABASE_CHANNEL_ID = '1398279525208424539';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);

// Helper to find if username exists
async function findUserMessage(channel, username) {
  const messages = await channel.messages.fetch({ limit: 100 });
  return messages.find(msg => msg.content.startsWith(`Username: ${username}\nToken:`));
}

// Signup
app.post('/signup', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).send('Missing username');

  try {
    const channel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const exists = await findUserMessage(channel, username);
    if (exists) return res.status(400).send('Username already exists');

    const token = Math.random().toString(36).slice(2, 10);
    await channel.send(`Username: ${username}\nToken: ${token}`);
    return res.send(`Account created!\nUsername: ${username}\nToken: ${token}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error creating account');
  }
});

// Login (with token file)
app.post('/login', upload.single('tokenFile'), async (req, res) => {
  const { username } = req.query;
  if (!username || !req.file) return res.status(400).send('Missing username or token file');

  try {
    const channel = await client.channels.fetch(DATABASE_CHANNEL_ID);
    const userMsg = await findUserMessage(channel, username);
    if (!userMsg) return res.status(404).send('Account not found');

    const savedToken = userMsg.content.split('Token: ')[1].trim();
    const fileContent = fs.readFileSync(req.file.path, 'utf8').trim();

    fs.unlinkSync(req.file.path); // clean up uploaded file

    if (fileContent === savedToken) {
      return res.send('Login successful!');
    } else {
      return res.status(401).send('Invalid token');
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Login failed');
  }
});

// Example message sender (if needed)
app.post('/send-message', async (req, res) => {
  const { channelId, message } = req.query;
  if (!channelId || !message) return res.status(400).send('Missing parameters');

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel.isTextBased()) return res.status(400).send('Invalid channel');

    await channel.send(message);
    res.send('Message sent!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to send message');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
