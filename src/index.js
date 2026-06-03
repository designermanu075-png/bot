import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { commandData } from './commands.js';
import { db, getConfig, updateConfig, audit, addFinance, currentBalance } from './database.js';
import {
  actionCreateModal,
  actionEmbed,
  actionPanel,
  adjustCashModal,
  approvalComponents,
  baseEmbed,
  configModal,
  configPanel,
  farmModal,
  finishActionModal,
  mainPanel,
  money,
  parseAmount,
  purchaseModal,
  refuseModal,
  registerModal,
  saleModal
} from './ui.js';
import {
  approveRegistration,
  isFinance,
  isLeader,
  isRecruiter,
  financeEmbed,
  makeBackup,
  memberProfileEmbed,
  parseConfigPatch,
  refuseRegistration,
  rankingEmbed,
  registrationEmbed,
  reportEmbed,
  sendLog
} from './services.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

async function registerCommands() {
  if (process.env.REGISTER_COMMANDS_ON_READY !== 'true') return;
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const route = process.env.GUILD_ID
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    : Routes.applicationCommands(process.env.CLIENT_ID);
  await rest.put(route, { body: commandData });
}

client.once('ready', async () => {
  await registerCommands();
  console.log(`✅ Bot online como ${client.user.tag}`);
});

async function requireGuild(interaction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ Use este comando dentro de um servidor.', ephemeral: true });
    return false;
  }
  getConfig(interaction.guildId);
  return true;
}

async function handleCommand(interaction) {
  if (!(await requireGuild(interaction))) return;
  const config = getConfig(interaction.guildId);
  const name = interaction.commandName;
  if (name === 'painel') return interaction.reply(mainPanel(config));
  if (name === 'config') {
    if (!isLeader(interaction.member, config)) return interaction.reply({ content: '❌ Apenas liderança pode configurar o bot.', ephemeral: true });
    return interaction.reply(configPanel(config));
  }
  if (name === 'registro') return interaction.showModal(registerModal());
  if (name === 'aprovar') return approveRegistration(interaction, interaction.options.getInteger('id'));
  if (name === 'recusar') return refuseRegistration(interaction, interaction.options.getInteger('id'), interaction.options.getString('motivo'));
  if (name === 'membro') {
    const user = interaction.options.getUser('usuario') || interaction.user;
    return interaction.reply({ embeds: [memberProfileEmbed(config, interaction.guildId, user.id)], ephemeral: true });
  }
  if (name === 'farm') {
    const sub = interaction.options.getSubcommand();
    if (sub === 'registrar') return interaction.showModal(farmModal());
    return interaction.reply({ embeds: [rankingEmbed(config, interaction.guildId, 'farm')], ephemeral: true });
  }
  if (name === 'acao') {
    const sub = interaction.options.getSubcommand();
    if (sub === 'criar') return interaction.showModal(actionCreateModal());
    return interaction.reply(actionPanel(config));
  }
  if (name === 'venda') return interaction.showModal(saleModal());
  if (name === 'compra') return interaction.showModal(purchaseModal());
  if (name === 'financeiro') {
    const sub = interaction.options.getSubcommand();
    if (sub === 'corrigir') {
      if (!isFinance(interaction.member, config)) return interaction.reply({ content: '❌ Apenas financeiro/liderança pode alterar o caixa.', ephemeral: true });
      return interaction.showModal(adjustCashModal());
    }
    return interaction.reply({ embeds: [financeEmbed(config, interaction.guildId)], ephemeral: true });
  }
  if (name === 'ranking') return interaction.reply({ embeds: [rankingEmbed(config, interaction.guildId, interaction.options.getString('tipo'))], ephemeral: true });
  if (name === 'relatorio') return interaction.reply({ embeds: [reportEmbed(config, interaction.guildId, interaction.options.getString('tipo'), interaction.options.getUser('membro')?.id || '')], ephemeral: true });
  if (name === 'logs') {
    const type = interaction.options.getString('tipo');
    const rows = type
      ? db.prepare('SELECT * FROM audit_logs WHERE guild_id = ? AND type = ? ORDER BY id DESC LIMIT 12').all(interaction.guildId, type)
      : db.prepare('SELECT * FROM audit_logs WHERE guild_id = ? ORDER BY id DESC LIMIT 12').all(interaction.guildId);
    const embed = baseEmbed(config, '📜 Logs do bot', rows.map((r) => `#${r.id} ${r.created_at} • **${r.type}** • ${r.title}`).join('\n') || 'Sem logs.');
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
  if (name === 'backup') {
    if (!isLeader(interaction.member, config)) return interaction.reply({ content: '❌ Apenas liderança pode exportar backups.', ephemeral: true });
    const { attachment } = await makeBackup(interaction);
    return interaction.reply({ content: '✅ Backup exportado com sucesso.', files: [attachment], ephemeral: true });
  }
}

async function submitRegistration(interaction) {
  const config = getConfig(interaction.guildId);
  const rpName = interaction.fields.getTextInputValue('nome').trim();
  const rpId = interaction.fields.getTextInputValue('id').trim();
  const phone = interaction.fields.getTextInputValue('telefone').trim();
  const recruiter = interaction.fields.getTextInputValue('recrutador').trim();
  const duplicate = db.prepare('SELECT id FROM members WHERE guild_id = ? AND rp_id = ?').get(interaction.guildId, rpId);
  if (duplicate) return interaction.reply({ content: '❌ Este ID já está cadastrado. Procure a liderança.', ephemeral: true });
  const pending = db.prepare('SELECT id FROM registrations WHERE guild_id = ? AND rp_id = ? AND status = ?').get(interaction.guildId, rpId, 'pending');
  if (pending) return interaction.reply({ content: `❌ Já existe um registro pendente para este ID (#${pending.id}).`, ephemeral: true });
  const result = db.prepare(`INSERT INTO registrations (guild_id, user_id, rp_name, rp_id, phone, recruiter) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(interaction.guildId, interaction.user.id, rpName, rpId, phone, recruiter);
  const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(result.lastInsertRowid);
  audit(interaction.guildId, 'registros_pendentes', interaction.user.id, interaction.user.id, 'Registro enviado', `${rpId} | ${rpName}`);
  const approvalChannel = config.approval_channel_id ? await interaction.guild.channels.fetch(config.approval_channel_id).catch(() => null) : null;
  const embed = registrationEmbed(config, registration);
  if (approvalChannel?.isTextBased()) {
    const msg = await approvalChannel.send({ embeds: [embed], components: approvalComponents(registration.id) });
    db.prepare('UPDATE registrations SET message_id = ? WHERE id = ?').run(msg.id, registration.id);
  }
  await sendLog(interaction.guild, 'registros_pendentes', embed);
  return interaction.reply({ content: '✅ Registro enviado! Aguarde aprovação da equipe.', ephemeral: true });
}

async function submitFarm(interaction) {
  const config = getConfig(interaction.guildId);
  const member = db.prepare('SELECT * FROM members WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, interaction.user.id);
  if (!member) return interaction.reply({ content: '❌ Você precisa estar aprovado para registrar farm.', ephemeral: true });
  const item = interaction.fields.getTextInputValue('item').trim();
  const quantity = parseAmount(interaction.fields.getTextInputValue('quantidade'));
  const observation = interaction.fields.getTextInputValue('observacao') || '';
  const proof = interaction.fields.getTextInputValue('comprovante') || '';
  if (quantity <= 0) return interaction.reply({ content: '❌ Quantidade inválida.', ephemeral: true });
  const result = db.prepare('INSERT INTO farms (guild_id, user_id, rp_id, item, quantity, observation, proof) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(interaction.guildId, interaction.user.id, member.rp_id, item, quantity, observation, proof);
  audit(interaction.guildId, 'farm', interaction.user.id, interaction.user.id, 'Farm registrado', `${item} x${quantity}`);
  const total = db.prepare('SELECT COALESCE(SUM(quantity),0) total FROM farms WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, interaction.user.id).total;
  const embed = baseEmbed(config, '📦 Farm registrado', `${interaction.user} registrou farm.`).addFields(
    { name: 'Item', value: item, inline: true }, { name: 'Quantidade', value: String(quantity), inline: true },
    { name: 'Total do membro', value: `${total}/${config.individual_farm_goal || 'sem meta'}`, inline: true },
    { name: 'Observação', value: observation || '—' }, { name: 'Comprovante', value: proof || '—' }
  );
  await sendLog(interaction.guild, 'farm', embed);
  const farmChannel = member.farm_channel_id ? await interaction.guild.channels.fetch(member.farm_channel_id).catch(() => null) : null;
  if (farmChannel?.isTextBased()) await farmChannel.send({ embeds: [embed] }).catch(() => null);
  return interaction.reply({ content: `✅ Farm #${result.lastInsertRowid} registrado.`, embeds: [embed], ephemeral: true });
}

async function submitSale(interaction) {
  const config = getConfig(interaction.guildId);
  const item = interaction.fields.getTextInputValue('item').trim();
  const [soldTo = '—', withdrawnBy = '—', receiver = '—'] = interaction.fields.getTextInputValue('dados').split('|').map((v) => v.trim());
  const [totalRaw = '0', withdrawnRaw = '0'] = interaction.fields.getTextInputValue('valores').split('|').map((v) => v.trim());
  const total = parseAmount(totalRaw);
  const withdrawn = parseAmount(withdrawnRaw);
  const proof = interaction.fields.getTextInputValue('comprovante') || '';
  const observation = interaction.fields.getTextInputValue('observacao') || '';
  const result = db.prepare(`INSERT INTO sales (guild_id, item, sold_to, total_value, withdrawn_value, withdrawn_by, seller_id, receiver, proof, observation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(interaction.guildId, item, soldTo, total, withdrawn, withdrawnBy, interaction.user.id, receiver, proof, observation);
  addFinance({ guildId: interaction.guildId, type: 'in', amount: total - withdrawn, memberId: interaction.user.id, source: 'venda', sourceId: String(result.lastInsertRowid), description: `Venda de ${item}`, createdBy: interaction.user.id });
  audit(interaction.guildId, 'vendas', interaction.user.id, interaction.user.id, 'Venda registrada', `${item} ${money(total)}`);
  const embed = baseEmbed(config, '💵 Venda registrada', `${interaction.user} registrou uma venda.`).addFields(
    { name: 'Item', value: item, inline: true }, { name: 'Cliente', value: soldTo, inline: true }, { name: 'Entrada no caixa', value: money(total - withdrawn), inline: true },
    { name: 'Valor total', value: money(total), inline: true }, { name: 'Retirada', value: `${money(withdrawn)} por ${withdrawnBy}`, inline: true }, { name: 'Saldo', value: money(currentBalance(interaction.guildId)), inline: true },
    { name: 'Recebeu', value: receiver }, { name: 'Comprovante', value: proof || '—' }, { name: 'Observação', value: observation || '—' }
  );
  await sendLog(interaction.guild, 'vendas', embed);
  await sendLog(interaction.guild, 'financeiro', embed);
  return interaction.reply({ content: `✅ Venda #${result.lastInsertRowid} registrada.`, embeds: [embed], ephemeral: true });
}

async function submitPurchase(interaction) {
  const config = getConfig(interaction.guildId);
  const item = interaction.fields.getTextInputValue('item').trim();
  const cost = parseAmount(interaction.fields.getTextInputValue('custo'));
  const boughtFrom = interaction.fields.getTextInputValue('origem').trim();
  const payment = interaction.fields.getTextInputValue('pagamento').trim();
  const [proof = '', observation = ''] = (interaction.fields.getTextInputValue('extra') || '').split('|').map((v) => v.trim());
  const result = db.prepare(`INSERT INTO purchases (guild_id, item, cost, bought_from, buyer_id, payment_method, proof, observation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(interaction.guildId, item, cost, boughtFrom, interaction.user.id, payment, proof, observation);
  addFinance({ guildId: interaction.guildId, type: 'out', amount: cost, memberId: interaction.user.id, source: 'compra', sourceId: String(result.lastInsertRowid), description: `Compra de ${item}`, createdBy: interaction.user.id });
  audit(interaction.guildId, 'compras', interaction.user.id, interaction.user.id, 'Compra registrada', `${item} ${money(cost)}`);
  const embed = baseEmbed(config, '🛒 Compra registrada', `${interaction.user} registrou uma compra.`).addFields(
    { name: 'Item', value: item, inline: true }, { name: 'Custo', value: money(cost), inline: true }, { name: 'Fornecedor', value: boughtFrom, inline: true },
    { name: 'Pagamento', value: payment, inline: true }, { name: 'Saldo', value: money(currentBalance(interaction.guildId)), inline: true }, { name: 'Comprovante', value: proof || '—' }, { name: 'Observação', value: observation || '—' }
  );
  await sendLog(interaction.guild, 'compras', embed);
  await sendLog(interaction.guild, 'financeiro', embed);
  return interaction.reply({ content: `✅ Compra #${result.lastInsertRowid} registrada.`, embeds: [embed], ephemeral: true });
}

async function submitAction(interaction) {
  const config = getConfig(interaction.guildId);
  const name = interaction.fields.getTextInputValue('nome').trim();
  const date = interaction.fields.getTextInputValue('data').trim();
  const time = interaction.fields.getTextInputValue('horario').trim();
  const max = parseAmount(interaction.fields.getTextInputValue('maximo'));
  const observation = interaction.fields.getTextInputValue('observacao') || '';
  const result = db.prepare('INSERT INTO actions (guild_id, name, action_date, action_time, max_participants, organizer_id, observation, channel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(interaction.guildId, name, date, time, max, interaction.user.id, observation, interaction.channelId);
  const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(result.lastInsertRowid);
  db.prepare('INSERT OR IGNORE INTO action_participants (action_id, user_id) VALUES (?, ?)').run(action.id, interaction.user.id);
  const participants = db.prepare('SELECT * FROM action_participants WHERE action_id = ?').all(action.id);
  const payload = actionEmbed(config, action, participants);
  const msg = await interaction.channel.send(payload);
  db.prepare('UPDATE actions SET message_id = ? WHERE id = ?').run(msg.id, action.id);
  audit(interaction.guildId, 'acoes', interaction.user.id, '', 'Ação criada', name);
  await sendLog(interaction.guild, 'acoes', payload.embeds[0]);
  return interaction.reply({ content: `✅ Ação #${action.id} criada.`, ephemeral: true });
}

async function submitFinishAction(interaction, actionId) {
  const config = getConfig(interaction.guildId);
  const action = db.prepare('SELECT * FROM actions WHERE id = ? AND guild_id = ?').get(actionId, interaction.guildId);
  if (!action || action.status !== 'open') return interaction.reply({ content: '❌ Ação inexistente ou já finalizada.', ephemeral: true });
  if (action.organizer_id !== interaction.user.id && !isLeader(interaction.member, config)) return interaction.reply({ content: '❌ Apenas o organizador ou liderança pode finalizar.', ephemeral: true });
  const result = interaction.fields.getTextInputValue('resultado').trim();
  const profit = parseAmount(interaction.fields.getTextInputValue('lucro'));
  const report = interaction.fields.getTextInputValue('relatorio') || '';
  db.prepare(`UPDATE actions SET status = 'finished', result = ?, profit_loss = ?, observation = observation || ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?`).run(result, profit, `\nRelatório: ${report}`, actionId);
  if (profit !== 0) addFinance({ guildId: interaction.guildId, type: profit > 0 ? 'in' : 'out', amount: Math.abs(profit), source: 'acao', sourceId: String(actionId), description: `Resultado ação ${action.name}: ${result}`, createdBy: interaction.user.id });
  const updated = db.prepare('SELECT * FROM actions WHERE id = ?').get(actionId);
  const participants = db.prepare('SELECT * FROM action_participants WHERE action_id = ?').all(actionId);
  const payload = actionEmbed(config, updated, participants);
  const channel = await interaction.guild.channels.fetch(action.channel_id).catch(() => null);
  const message = channel ? await channel.messages.fetch(action.message_id).catch(() => null) : null;
  if (message) await message.edit(payload);
  audit(interaction.guildId, 'acoes', interaction.user.id, '', 'Ação finalizada', `${action.name}: ${result} ${money(profit)}`);
  await sendLog(interaction.guild, 'acoes', payload.embeds[0]);
  return interaction.reply({ content: '✅ Ação finalizada e ranking atualizado.', ephemeral: true });
}

async function updateActionMessage(interaction, actionId, mode) {
  const config = getConfig(interaction.guildId);
  const action = db.prepare('SELECT * FROM actions WHERE id = ? AND guild_id = ?').get(actionId, interaction.guildId);
  if (!action || action.status !== 'open') return interaction.reply({ content: '❌ Ação inexistente ou fechada.', ephemeral: true });
  if (mode === 'join') {
    const count = db.prepare('SELECT COUNT(*) count FROM action_participants WHERE action_id = ?').get(actionId).count;
    if (count >= action.max_participants) return interaction.reply({ content: '❌ Ação lotada.', ephemeral: true });
    db.prepare('INSERT OR IGNORE INTO action_participants (action_id, user_id) VALUES (?, ?)').run(actionId, interaction.user.id);
  }
  if (mode === 'leave') db.prepare('DELETE FROM action_participants WHERE action_id = ? AND user_id = ?').run(actionId, interaction.user.id);
  if (mode === 'cancel') {
    if (action.organizer_id !== interaction.user.id && !isLeader(interaction.member, config)) return interaction.reply({ content: '❌ Apenas o organizador ou liderança pode cancelar.', ephemeral: true });
    db.prepare(`UPDATE actions SET status = 'cancelled', result = 'Cancelada', finished_at = CURRENT_TIMESTAMP WHERE id = ?`).run(actionId);
  }
  const updated = db.prepare('SELECT * FROM actions WHERE id = ?').get(actionId);
  const participants = db.prepare('SELECT * FROM action_participants WHERE action_id = ?').all(actionId);
  await interaction.update(actionEmbed(config, updated, participants));
  audit(interaction.guildId, 'acoes', interaction.user.id, '', `Ação ${mode}`, action.name);
}

async function handleButton(interaction) {
  if (!(await requireGuild(interaction))) return;
  const config = getConfig(interaction.guildId);
  const [area, action, id] = interaction.customId.split(':');
  if (interaction.customId === 'register:start') return interaction.showModal(registerModal());
  if (interaction.customId === 'farm:open') return interaction.showModal(farmModal());
  if (interaction.customId === 'sale:open') return interaction.showModal(saleModal());
  if (interaction.customId === 'purchase:open') return interaction.showModal(purchaseModal());
  if (interaction.customId === 'action:panel') return interaction.reply(actionPanel(config));
  if (interaction.customId === 'action:create') return interaction.showModal(actionCreateModal());
  if (interaction.customId === 'action:list') {
    const rows = db.prepare("SELECT * FROM actions WHERE guild_id = ? AND status = 'open' ORDER BY id DESC LIMIT 10").all(interaction.guildId);
    const embed = baseEmbed(config, '📋 Ações abertas', rows.map((a) => `#${a.id} **${a.name}** • ${a.action_date} ${a.action_time} • ${a.max_participants} vagas`).join('\n') || 'Nenhuma ação aberta.');
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
  if (interaction.customId === 'finance:summary') return interaction.reply({ embeds: [financeEmbed(config, interaction.guildId)], ephemeral: true });
  if (interaction.customId === 'member:me') return interaction.reply({ embeds: [memberProfileEmbed(config, interaction.guildId, interaction.user.id)], ephemeral: true });
  if (interaction.customId === 'support:help') return interaction.reply({ content: config.support_channel_id ? `🆘 Abra um chamado ou fale em <#${config.support_channel_id}>.` : '🆘 Procure a liderança da facção.', ephemeral: true });
  if (interaction.customId === 'ranking:menu') {
    const menu = new StringSelectMenuBuilder().setCustomId('ranking:select').setPlaceholder('Escolha o ranking').addOptions(
      { label: 'Farm', value: 'farm' }, { label: 'Ações', value: 'acoes' }, { label: 'Vendas', value: 'vendas' }, { label: 'Compras', value: 'compras' }, { label: 'Financeiro', value: 'financeiro' }, { label: 'Ativos', value: 'ativos' }
    );
    return interaction.reply({ content: '🏆 Selecione o ranking:', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
  }
  if (area === 'register' && action === 'approve') return approveRegistration(interaction, Number(id));
  if (area === 'register' && action === 'refusebtn') {
    if (!isRecruiter(interaction.member, config)) return interaction.reply({ content: '❌ Apenas recrutadores autorizados.', ephemeral: true });
    return interaction.showModal(refuseModal(id));
  }
  if (area === 'action' && ['join', 'leave', 'cancel'].includes(action)) return updateActionMessage(interaction, Number(id), action);
  if (area === 'action' && action === 'finishbtn') return interaction.showModal(finishActionModal(id));
}

async function handleSelect(interaction) {
  const config = getConfig(interaction.guildId);
  if (interaction.customId === 'ranking:select') return interaction.update({ embeds: [rankingEmbed(config, interaction.guildId, interaction.values[0])], components: [] });
  if (interaction.customId === 'config:menu') {
    if (!isLeader(interaction.member, config)) return interaction.reply({ content: '❌ Apenas liderança pode configurar.', ephemeral: true });
    return interaction.showModal(configModal(interaction.values[0]));
  }
}

async function handleModal(interaction) {
  if (!(await requireGuild(interaction))) return;
  if (interaction.customId === 'register:submit') return submitRegistration(interaction);
  if (interaction.customId === 'farm:submit') return submitFarm(interaction);
  if (interaction.customId === 'sale:submit') return submitSale(interaction);
  if (interaction.customId === 'purchase:submit') return submitPurchase(interaction);
  if (interaction.customId === 'action:create:submit') return submitAction(interaction);
  if (interaction.customId.startsWith('action:finish:')) return submitFinishAction(interaction, Number(interaction.customId.split(':')[2]));
  if (interaction.customId.startsWith('register:refuse:')) return refuseRegistration(interaction, Number(interaction.customId.split(':')[2]), interaction.fields.getTextInputValue('motivo'));
  if (interaction.customId === 'finance:adjust:submit') {
    const config = getConfig(interaction.guildId);
    if (!isFinance(interaction.member, config)) return interaction.reply({ content: '❌ Apenas financeiro/liderança pode alterar o caixa.', ephemeral: true });
    const value = parseAmount(interaction.fields.getTextInputValue('valor'));
    const reason = interaction.fields.getTextInputValue('motivo');
    addFinance({ guildId: interaction.guildId, type: 'adjust', amount: value, source: 'ajuste_manual', description: reason, createdBy: interaction.user.id });
    const embed = baseEmbed(config, '🏦 Caixa corrigido', `Novo saldo: **${money(value)}**`).addFields({ name: 'Motivo', value: reason }, { name: 'Responsável', value: `${interaction.user}` });
    audit(interaction.guildId, 'financeiro', interaction.user.id, '', 'Correção manual do caixa', reason);
    await sendLog(interaction.guild, 'financeiro', embed);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
  if (interaction.customId.startsWith('config:submit:')) {
    const config = getConfig(interaction.guildId);
    if (!isLeader(interaction.member, config)) return interaction.reply({ content: '❌ Apenas liderança pode configurar.', ephemeral: true });
    const field = interaction.customId.split(':')[2];
    const patch = parseConfigPatch(field, interaction.fields.getTextInputValue('valor'));
    const updated = updateConfig(interaction.guildId, patch);
    audit(interaction.guildId, 'admin', interaction.user.id, '', `Configuração alterada: ${field}`, JSON.stringify(patch));
    await sendLog(interaction.guild, 'admin', baseEmbed(updated, '⚙️ Configuração alterada', `Área atualizada: **${field}**`));
    return interaction.reply({ content: '✅ Configuração salva.', ...configPanel(updated) });
  }
}

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) return handleCommand(interaction);
  if (interaction.isButton()) return handleButton(interaction);
  if (interaction.isStringSelectMenu()) return handleSelect(interaction);
  if (interaction.isModalSubmit()) return handleModal(interaction);
});

client.on('error', (error) => console.error('Erro do cliente:', error));
process.on('unhandledRejection', (error) => console.error('Rejeição não tratada:', error));

if (!process.env.DISCORD_TOKEN) {
  console.error('Configure DISCORD_TOKEN no arquivo .env.');
  process.exit(1);
}

await client.login(process.env.DISCORD_TOKEN);
