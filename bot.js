// Import required modules
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

// Create express app
const app = express();

// Discord bot token — replace this with your actual token
const DISCORD_TOKEN = 'YOUR_DISCORD_BOT_TOKEN';

// Create Discord bot client with basic intents
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Start bot when ready
client.once('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
});

// Login the bot
client.login(DISCORD_TOKEN);

// Create a GET route to return a user’s avatar URL
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

    // Return profile picture URL
    return res.send(user.displayAvatarURL({ dynamic: true, size: 1024 }));
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return res.status(500).send('Internal error while fetching user');
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running at http://localhost:${PORT}`);
});
