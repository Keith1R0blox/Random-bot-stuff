const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
app.use(express.json());

const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // Replace this
const STORAGE_CHANNEL_ID = '1398279525208424539';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel, Partials.Message],
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);

// POST /register
app.post('/register', async (req, res) => {
  const { username, token } = req.body;

  if (!username || !token) {
    return res.status(400).send('Missing username or token');
  }

  try {
    const channel = await client.channels.fetch(STORAGE_CHANNEL_ID);
    const messages = await channel.messages.fetch({ limit: 100 });

    const exists = messages.some(msg => {
      const match = msg.content.match(/^Username:\s*(.+)\nToken:\s*(.+)$/);
      return match && match[1].trim() === username;
    });

    if (exists) {
      return res.status(403).send('Username already exists.');
    }

    await channel.send(`Username: ${username}\nToken: ${token}`);
    return res.send('✅ Registered successfully.');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});
