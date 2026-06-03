import fs from 'node:fs';
import path from 'node:path';
import { AttachmentBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { db, getConfig, audit, addFinance, currentBalance, exportGuild } from './database.js';
import { baseEmbed, COLORS, limit, money, parseAmount, parseIds } from './ui.js';

export function hasAnyRole(member, roleIds = []) {
  return roleIds.some((id) => member.roles.cache.has(id));
}

export function isLeader(member, config) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild) || hasAnyRole(member, config.leader_role_ids);
}

export function isRecruiter(member, config) {
  return isLeader(member, config) || hasAnyRole(member, config.recruiter_role_ids);
}

export function isFinance(member, config) {
  return isLeader(member, config) || hasAnyRole(member, config.finance_role_ids);
}

export async function sendLog(guild, type, embed) {
  const config = getConfig(guild.id);
  const channelId = config.log_channels_json[type] || config.log_channels_json.geral || '';
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => null);
}

export function registrationEmbed(config, registration) {
  return baseEmbed(config, `📝 Registro pendente #${registration.id}`, 'Novo membro aguardando aprovação.').addFields(
    { name: 'Usuário', value: `<@${registration.user_id}>`, inline: true },
    { name: 'Nome', value: registration.rp_name, inline: true },
    { name: 'ID', value: registration.rp_id, inline: true },
    { name: 'Telefone', value: registration.phone, inline: true },
    { name: 'Recrutador', value: registration.recruiter, inline: true },
    { name: 'Status', value: registration.status, inline: true }
  );
}

export async function createFarmSpace(guild, member, rpId, rpName, config) {
  const existing = db.prepare('SELECT farm_channel_id FROM members WHERE guild_id = ? AND rp_id = ?').get(guild.id, rpId)?.farm_channel_id;
  if (existing) return existing;
  const safe = `${rpId} | ${rpName}`.slice(0, 90);
  if (config.farm_forum_channel_id) {
    const forum = await guild.channels.fetch(config.farm_forum_channel_id).catch(() => null);
    if (forum?.type === ChannelType.GuildForum) {
      const thread = await forum.threads.create({ name: safe, message: { content: `📦 Farm individual de ${member}` } }).catch(() => null);
      if (thread) return thread.id;
    }
  }
  const channel = await guild.channels.create({
    name: safe.toLowerCase().replace(/[^a-z0-9| -]/gi, '').replaceAll(' ', '-').slice(0, 90),
    type: ChannelType.GuildText,
    parent: config.farm_category_id || undefined,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
    ]
  }).catch(() => null);
  return channel?.id || '';
}

export async function approveRegistration(interaction, registrationId) {
  const guild = interaction.guild;
  const config = getConfig(guild.id);
  if (!isRecruiter(interaction.member, config)) return interaction.reply({ content: '❌ Apenas recrutadores autorizados podem aprovar registros.', ephemeral: true });
  const registration = db.prepare('SELECT * FROM registrations WHERE id = ? AND guild_id = ?').get(registrationId, guild.id);
  if (!registration || registration.status !== 'pending') return interaction.reply({ content: '❌ Registro inexistente ou já revisado.', ephemeral: true });
  const duplicate = db.prepare('SELECT id FROM members WHERE guild_id = ? AND rp_id = ?').get(guild.id, registration.rp_id);
  if (duplicate) return interaction.reply({ content: '❌ Este ID já está cadastrado. Aprovação bloqueada.', ephemeral: true });
  const discordMember = await guild.members.fetch(registration.user_id).catch(() => null);
  if (!discordMember) return interaction.reply({ content: '❌ Membro não encontrado no servidor.', ephemeral: true });
  const nickname = config.nickname_format.replace('{id}', registration.rp_id).replace('{nome}', registration.rp_name).slice(0, 32);
  await discordMember.setNickname(nickname).catch(() => null);
  if (config.member_role_id) await discordMember.roles.add(config.member_role_id).catch(() => null);
  const farmChannelId = await createFarmSpace(guild, discordMember, registration.rp_id, registration.rp_name, config);
  db.transaction(() => {
    db.prepare(`INSERT INTO members (guild_id, user_id, rp_name, rp_id, phone, recruiter, farm_channel_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(guild.id, registration.user_id, registration.rp_name, registration.rp_id, registration.phone, registration.recruiter, farmChannelId);
    db.prepare(`UPDATE registrations SET status = 'approved', reviewer_id = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(interaction.user.id, registrationId);
    audit(guild.id, 'registros_aprovados', interaction.user.id, registration.user_id, 'Registro aprovado', `ID ${registration.rp_id} | ${registration.rp_name}`);
  })();
  const embed = baseEmbed(config, '✅ Registro aprovado', `${discordMember} foi aprovado na facção.`).addFields(
    { name: 'Nick', value: nickname, inline: true },
    { name: 'Farm', value: farmChannelId ? `<#${farmChannelId}>` : 'Não criado (ver permissões).', inline: true },
    { name: 'Aprovado por', value: `${interaction.user}`, inline: true }
  );
  await sendLog(guild, 'registros_aprovados', embed);
  await discordMember.send({ embeds: [embed] }).catch(() => null);
  return interaction.update({ embeds: [embed], components: [] });
}

export async function refuseRegistration(interaction, registrationId, reason) {
  const guild = interaction.guild;
  const config = getConfig(guild.id);
  if (!isRecruiter(interaction.member, config)) return interaction.reply({ content: '❌ Apenas recrutadores autorizados podem recusar registros.', ephemeral: true });
  const registration = db.prepare('SELECT * FROM registrations WHERE id = ? AND guild_id = ?').get(registrationId, guild.id);
  if (!registration || registration.status !== 'pending') return interaction.reply({ content: '❌ Registro inexistente ou já revisado.', ephemeral: true });
  db.prepare(`UPDATE registrations SET status = 'refused', reviewer_id = ?, refusal_reason = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(interaction.user.id, reason, registrationId);
  audit(guild.id, 'registros_recusados', interaction.user.id, registration.user_id, 'Registro recusado', reason);
  const embed = baseEmbed(config, '❌ Registro recusado', `<@${registration.user_id}> teve o registro recusado.`).addFields(
    { name: 'Motivo', value: limit(reason), inline: false },
    { name: 'Revisado por', value: `${interaction.user}`, inline: true }
  ).setColor(COLORS.error);
  await sendLog(guild, 'registros_recusados', embed);
  const user = await interaction.client.users.fetch(registration.user_id).catch(() => null);
  await user?.send({ embeds: [embed] }).catch(() => null);
  return interaction.update({ embeds: [embed], components: [] });
}

export function memberProfileEmbed(config, guildId, userId) {
  const member = db.prepare('SELECT * FROM members WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  if (!member) return baseEmbed(config, '👤 Perfil', 'Membro não cadastrado.').setColor(COLORS.warn);
  const farm = db.prepare('SELECT COALESCE(SUM(quantity),0) total, COUNT(*) count FROM farms WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  const sales = db.prepare('SELECT COALESCE(SUM(total_value),0) total, COUNT(*) count FROM sales WHERE guild_id = ? AND seller_id = ?').get(guildId, userId);
  const actions = db.prepare('SELECT COUNT(*) count FROM action_participants ap JOIN actions a ON a.id = ap.action_id WHERE a.guild_id = ? AND ap.user_id = ?').get(guildId, userId);
  const purchases = db.prepare('SELECT COALESCE(SUM(cost),0) total, COUNT(*) count FROM purchases WHERE guild_id = ? AND buyer_id = ?').get(guildId, userId);
  return baseEmbed(config, `👤 ${member.rp_id} | ${member.rp_name}`, 'Perfil completo do membro.').addFields(
    { name: 'Telefone', value: member.phone, inline: true },
    { name: 'Recrutador', value: member.recruiter, inline: true },
    { name: 'Cargo', value: member.role_name, inline: true },
    { name: 'Entrada', value: member.joined_at, inline: true },
    { name: 'Farm total', value: `${farm.total} itens (${farm.count} registros)`, inline: true },
    { name: 'Vendas', value: `${money(sales.total)} (${sales.count})`, inline: true },
    { name: 'Ações', value: `${actions.count} participações`, inline: true },
    { name: 'Compras', value: `${money(purchases.total)} (${purchases.count})`, inline: true },
    { name: 'Advertências', value: JSON.parse(member.warnings).length ? JSON.parse(member.warnings).join('\n') : 'Nenhuma', inline: false }
  );
}

export function rankingEmbed(config, guildId, type) {
  const queries = {
    farm: ['🏆 Ranking de farm', `SELECT m.rp_id, m.rp_name, COALESCE(SUM(f.quantity),0) score FROM members m LEFT JOIN farms f ON f.guild_id=m.guild_id AND f.user_id=m.user_id WHERE m.guild_id=? GROUP BY m.id ORDER BY score DESC LIMIT 10`, (r) => `${r.score} itens`],
    acoes: ['⚔️ Ranking de ações', `SELECT m.rp_id, m.rp_name, COUNT(ap.user_id) score FROM members m LEFT JOIN action_participants ap ON ap.user_id=m.user_id LEFT JOIN actions a ON a.id=ap.action_id AND a.guild_id=m.guild_id WHERE m.guild_id=? GROUP BY m.id ORDER BY score DESC LIMIT 10`, (r) => `${r.score} ações`],
    vendas: ['💵 Ranking de vendas', `SELECT m.rp_id, m.rp_name, COALESCE(SUM(s.total_value),0) score FROM members m LEFT JOIN sales s ON s.guild_id=m.guild_id AND s.seller_id=m.user_id WHERE m.guild_id=? GROUP BY m.id ORDER BY score DESC LIMIT 10`, (r) => money(r.score)],
    compras: ['🛒 Ranking de compras', `SELECT m.rp_id, m.rp_name, COALESCE(SUM(p.cost),0) score FROM members m LEFT JOIN purchases p ON p.guild_id=m.guild_id AND p.buyer_id=m.user_id WHERE m.guild_id=? GROUP BY m.id ORDER BY score DESC LIMIT 10`, (r) => money(r.score)],
    financeiro: ['🏦 Ranking financeiro', `SELECT m.rp_id, m.rp_name, COALESCE(SUM(ABS(f.amount)),0) score FROM members m LEFT JOIN finances f ON f.guild_id=m.guild_id AND f.member_id=m.user_id WHERE m.guild_id=? GROUP BY m.id ORDER BY score DESC LIMIT 10`, (r) => money(r.score)],
    ativos: ['🔥 Membros mais ativos', `SELECT m.rp_id, m.rp_name, (COUNT(DISTINCT f.id)+COUNT(DISTINCT s.id)+COUNT(DISTINCT p.id)+COUNT(DISTINCT ap.action_id)) score FROM members m LEFT JOIN farms f ON f.guild_id=m.guild_id AND f.user_id=m.user_id LEFT JOIN sales s ON s.guild_id=m.guild_id AND s.seller_id=m.user_id LEFT JOIN purchases p ON p.guild_id=m.guild_id AND p.buyer_id=m.user_id LEFT JOIN action_participants ap ON ap.user_id=m.user_id WHERE m.guild_id=? GROUP BY m.id ORDER BY score DESC LIMIT 10`, (r) => `${r.score} atividades`]
  };
  const [title, sql, format] = queries[type] || queries.farm;
  const rows = db.prepare(sql).all(guildId);
  const text = rows.map((r, i) => `**${i + 1}.** ${r.rp_id} | ${r.rp_name} — ${format(r)}`).join('\n') || 'Sem dados.';
  return baseEmbed(config, title, text);
}

export function financeEmbed(config, guildId) {
  const balance = currentBalance(guildId);
  const totals = db.prepare(`SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END),0) entradas, COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END),0) saidas FROM finances WHERE guild_id = ?`).get(guildId);
  const history = db.prepare('SELECT * FROM finances WHERE guild_id = ? ORDER BY id DESC LIMIT 8').all(guildId);
  return baseEmbed(config, '🏦 Financeiro da facção', `Saldo atual: **${money(balance)}**`).addFields(
    { name: 'Entradas', value: money(totals.entradas), inline: true },
    { name: 'Saídas', value: money(totals.saidas), inline: true },
    { name: 'Últimas movimentações', value: history.map((h) => `#${h.id} ${h.type} ${money(h.amount)} — ${h.description}`).join('\n') || 'Sem movimentações.' }
  );
}

export function reportEmbed(config, guildId, type, memberId = '') {
  const whereMember = memberId ? ' AND member_id = ?' : '';
  if (type === 'financeiro') {
    const args = memberId ? [guildId, memberId] : [guildId];
    const rows = db.prepare(`SELECT * FROM finances WHERE guild_id = ?${whereMember} ORDER BY id DESC LIMIT 15`).all(...args);
    return baseEmbed(config, '📊 Relatório financeiro', rows.map((r) => `#${r.id} ${r.created_at} • ${r.type} • ${money(r.amount)} • ${r.description}`).join('\n') || 'Sem dados.');
  }
  const maps = {
    farm: ['farms', 'user_id', (r) => `${r.created_at} • ${r.item} • ${r.quantity} • <@${r.user_id}>`],
    vendas: ['sales', 'seller_id', (r) => `${r.created_at} • ${r.item} • ${money(r.total_value)} • <@${r.seller_id}>`],
    compras: ['purchases', 'buyer_id', (r) => `${r.created_at} • ${r.item} • ${money(r.cost)} • <@${r.buyer_id}>`]
  };
  const [table, col, fmt] = maps[type] || maps.farm;
  const args = memberId ? [guildId, memberId] : [guildId];
  const rows = db.prepare(`SELECT * FROM ${table} WHERE guild_id = ?${memberId ? ` AND ${col} = ?` : ''} ORDER BY id DESC LIMIT 15`).all(...args);
  return baseEmbed(config, `📊 Relatório de ${type}`, rows.map(fmt).join('\n') || 'Sem dados.');
}

export async function makeBackup(interaction) {
  const data = exportGuild(interaction.guildId);
  fs.mkdirSync('./backups', { recursive: true });
  const file = path.resolve('./backups', `backup-${interaction.guildId}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  const attachment = new AttachmentBuilder(file);
  audit(interaction.guildId, 'backup', interaction.user.id, '', 'Backup exportado', file);
  return { file, attachment };
}

export function parseConfigPatch(field, raw) {
  const chunks = raw.split('|').map((s) => s.trim());
  if (field === 'identity') return { faction_name: chunks[0], embed_color: chunks[1] || '#8A2BE2', banner_url: chunks[2] || '', icon_url: chunks[3] || '' };
  if (field === 'roles') return { member_role_id: parseIds(chunks[0])[0] || '', recruiter_role_ids: parseIds(chunks[1]), leader_role_ids: parseIds(chunks[2]), finance_role_ids: parseIds(chunks[3]) };
  if (field === 'channels') return { approval_channel_id: parseIds(chunks[0])[0] || '', support_channel_id: parseIds(chunks[1])[0] || '', farm_category_id: parseIds(chunks[2])[0] || '', farm_forum_channel_id: parseIds(chunks[3])[0] || '' };
  if (field === 'logs') return { log_channels_json: Object.fromEntries(raw.split('\n').map((line) => line.split('=').map((v) => v.trim())).filter((v) => v[0] && v[1])) };
  if (field === 'goals') return { individual_farm_goal: parseAmount(chunks[0]), general_farm_goal: parseAmount(chunks[1]) };
  if (field === 'lists') return { action_types: chunks[0]?.split(',').map((v) => v.trim()).filter(Boolean) || [], sale_items: chunks[1]?.split(',').map((v) => v.trim()).filter(Boolean) || [], purchase_items: chunks[2]?.split(',').map((v) => v.trim()).filter(Boolean) || [] };
  if (field === 'nick') return { nickname_format: raw.trim() };
  if (field === 'messages') return { messages_json: Object.fromEntries(raw.split('\n').map((line) => line.split('=').map((v) => v.trim())).filter((v) => v[0] && v[1])) };
  return {};
}
