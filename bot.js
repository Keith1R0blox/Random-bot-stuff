// Import required modules
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

// Create express app
const app = express();

// Discord bot token — replace with your real token (store in .env in production!)
const DISCORD_TOKEN = 'YOUR_DISCORD_BOT_TOKEN';

// Create a Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // Optional, only needed for content parsing
  ]
});

// When bot is ready
client.once('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
});

// Login the bot
client.login(DISCORD_TOKEN);

// GET /pfp?id=USER_ID → returns avatar URL
app.get('/pfp', async (req, res) => {
  const userId = req.query.id;

  if (!userId) {
    return res.status(400).send('Missing user ID');
  }

  try {
    const user = await client.users.fetch(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Send the profile picture URL
    return res.send(user.displayAvatarURL({ dynamic: true, size: 1024 }));
  } catch (error) {
    console.error('❌ Failed to fetch user:', error);
    return res.status(500).send('Error fetching user');
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on http://localhost:${PORT}`);
});
  
