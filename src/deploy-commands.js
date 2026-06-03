import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commandData } from './commands.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('Configure DISCORD_TOKEN e CLIENT_ID no .env.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);
const route = guildId ? Routes.applicationGuildCommands(clientId, guildId) : Routes.applicationCommands(clientId);
await rest.put(route, { body: commandData });
console.log(`✅ ${commandData.length} comandos registrados ${guildId ? `na guild ${guildId}` : 'globalmente'}.`);
