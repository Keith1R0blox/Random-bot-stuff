const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();
app.use(express.json());

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('ready', () => {
  console.log(`Bot ready as ${client.user.tag}`);
});

app.post('/pfp', async (req, res) => {
  const { username } = req.body;

  if (!username) return res.status(400).send("Missing username");

  try {
    const guild = client.guilds.cache.first();
    if (!guild) return res.status(500).send("No guild available");

    await guild.members.fetch(); // Ensure member list is populated

    const member = guild.members.cache.find(
      m => m.user.username.toLowerCase() === username.toLowerCase()
    );

    if (!member) return res.status(404).send("User not found");

    const avatarURL = member.user.displayAvatarURL({ format: 'png', size: 1024 });
    res.send(avatarURL); // ✅ Just return the link as plain text
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal error");
  }
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.get('/pfp', async (req, res) => {
  const userId = req.query.id;

  if (!userId) return res.status(400).send('Missing user ID');

  try {
    const user = await client.users.fetch(userId);
    res.send(user.displayAvatarURL({ dynamic: true, size: 1024 }));
  } catch (err) {
    res.status(404).send('User not found');
  }
});

app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
