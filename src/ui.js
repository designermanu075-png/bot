import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

export const COLORS = { ok: 0x2ecc71, warn: 0xf1c40f, error: 0xe74c3c, info: 0x3498db };
export const money = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR')}`;
export const limit = (text, size = 1024) => String(text || '—').slice(0, size);
export const parseAmount = (value) => Math.round(Number(String(value).replace(/[^0-9,-]/g, '').replace(',', '.')) || 0);
export const parseIds = (value) => String(value || '').split(/[ ,;\n]+/).map((v) => v.replace(/[<@&>]/g, '')).filter(Boolean);
export const hexColor = (value) => Number.parseInt(String(value || '#8A2BE2').replace('#', ''), 16) || 0x8A2BE2;

export function baseEmbed(config, title, description) {
  const embed = new EmbedBuilder()
    .setColor(hexColor(config.embed_color))
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
  if (config.banner_url) embed.setImage(config.banner_url);
  if (config.icon_url) embed.setThumbnail(config.icon_url);
  return embed.setFooter({ text: config.faction_name });
}

export function mainPanel(config) {
  const labels = config.button_labels_json || {};
  const embed = baseEmbed(config, `🏴 ${config.faction_name}`, labels.panelText || 'Painel principal da facção. Use os botões abaixo para acessar todos os sistemas.');
  embed.addFields(
    { name: '📝 Registro', value: 'Cadastre-se e aguarde aprovação.', inline: true },
    { name: '📦 Farm', value: 'Registre entregas e acompanhe metas.', inline: true },
    { name: '💰 Gestão', value: 'Vendas, compras, financeiro e relatórios.', inline: true }
  );
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('register:start').setLabel(labels.register || 'Registrar-se').setEmoji('📝').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('farm:open').setLabel(labels.farm || 'Farm').setEmoji('📦').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('action:panel').setLabel(labels.actions || 'Ações').setEmoji('⚔️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('sale:open').setLabel(labels.sales || 'Vendas').setEmoji('💵').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('purchase:open').setLabel(labels.purchases || 'Compras').setEmoji('🛒').setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('finance:summary').setLabel(labels.finance || 'Financeiro').setEmoji('🏦').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ranking:menu').setLabel(labels.ranking || 'Ranking').setEmoji('🏆').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('member:me').setLabel(labels.me || 'Meus dados').setEmoji('👤').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('support:help').setLabel(labels.support || 'Suporte/ajuda').setEmoji('🆘').setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [row1, row2] };
}

export function registerModal() {
  return new ModalBuilder().setCustomId('register:submit').setTitle('Registro da Facção').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome').setPlaceholder('Ex: João Silva').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(80)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id').setLabel('ID').setPlaceholder('Ex: 123').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(20)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('telefone').setLabel('Telefone').setPlaceholder('Ex: 555-0101').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(30)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('recrutador').setLabel('Recrutador').setPlaceholder('Nome ou @ do recrutador').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(80))
  );
}

export function farmModal() {
  return new ModalBuilder().setCustomId('farm:submit').setTitle('Registrar farm').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item').setLabel('Item').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(80)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('quantidade').setLabel('Quantidade').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(12)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('observacao').setLabel('Observação').setRequired(false).setStyle(TextInputStyle.Paragraph).setMaxLength(500)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comprovante').setLabel('Comprovante/print (URL)').setRequired(false).setStyle(TextInputStyle.Short).setMaxLength(300))
  );
}

export function saleModal() {
  return new ModalBuilder().setCustomId('sale:submit').setTitle('Registrar venda').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item').setLabel('Item vendido').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(80)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('dados').setLabel('Para quem | Quem retirou | Quem recebeu').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(180)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('valores').setLabel('Valor total | Quanto foi retirado').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(60)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comprovante').setLabel('Comprovante/print (URL)').setRequired(false).setStyle(TextInputStyle.Short).setMaxLength(300)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('observacao').setLabel('Observação').setRequired(false).setStyle(TextInputStyle.Paragraph).setMaxLength(500))
  );
}

export function purchaseModal() {
  return new ModalBuilder().setCustomId('purchase:submit').setTitle('Registrar compra').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item').setLabel('O que foi comprado').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(80)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('custo').setLabel('Quanto custou').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(30)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('origem').setLabel('Com quem foi comprado').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(100)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pagamento').setLabel('Forma de pagamento').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(80)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('extra').setLabel('Comprovante URL | Observação').setRequired(false).setStyle(TextInputStyle.Paragraph).setMaxLength(700))
  );
}

export function actionCreateModal() {
  return new ModalBuilder().setCustomId('action:create:submit').setTitle('Criar ação').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome/tipo da ação').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(80)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('data').setLabel('Data').setPlaceholder('DD/MM/AAAA').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(20)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('horario').setLabel('Horário').setPlaceholder('HH:MM').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(20)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('maximo').setLabel('Quantidade máxima de participantes').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(5)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('observacao').setLabel('Organizador/observação').setRequired(false).setStyle(TextInputStyle.Paragraph).setMaxLength(500))
  );
}

export function finishActionModal(actionId) {
  return new ModalBuilder().setCustomId(`action:finish:${actionId}`).setTitle('Finalizar ação').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('resultado').setLabel('Resultado: Vitória, Derrota ou Cancelada').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(20)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('lucro').setLabel('Lucro/prejuízo (use negativo para prejuízo)').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(30)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('relatorio').setLabel('Relatório final').setRequired(false).setStyle(TextInputStyle.Paragraph).setMaxLength(900))
  );
}

export function refuseModal(registrationId) {
  return new ModalBuilder().setCustomId(`register:refuse:${registrationId}`).setTitle('Recusar registro').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo da recusa').setRequired(true).setStyle(TextInputStyle.Paragraph).setMaxLength(700))
  );
}

export function adjustCashModal() {
  return new ModalBuilder().setCustomId('finance:adjust:submit').setTitle('Correção manual do caixa').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('valor').setLabel('Novo saldo do caixa').setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(30)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo da correção').setRequired(true).setStyle(TextInputStyle.Paragraph).setMaxLength(700))
  );
}

export function configModal(field) {
  const labels = {
    identity: ['Nome | Cor HEX | Banner URL | Ícone URL', 'Ex: Minha Facção | #8A2BE2 | https://... | https://...'],
    roles: ['Cargo membro | Recrutadores | Liderança | Financeiro', 'IDs separados por vírgula; primeiro campo é 1 cargo'],
    channels: ['Aprovação | Suporte | Categoria farm | Fórum farm', 'IDs de canais/categorias separados por |'],
    logs: ['Tipo=canal, um por linha', 'Ex: farm=123\nfinanceiro=456\nregistros_aprovados=789'],
    goals: ['Meta individual | Meta geral', 'Ex: 1000 | 50000'],
    lists: ['Tipos ação | Itens venda | Itens compra', 'Valores separados por vírgula em cada bloco com |'],
    nick: ['Formato do nick', 'Use {id} e {nome}. Ex: {id} | {nome}'],
    messages: ['Chave=texto, um por linha', 'panelText=Bem-vindo\nregister=Registrar-se']
  };
  const [label, placeholder] = labels[field] || labels.identity;
  return new ModalBuilder().setCustomId(`config:submit:${field}`).setTitle('Configuração da facção').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('valor').setLabel(label).setPlaceholder(placeholder).setRequired(true).setStyle(TextInputStyle.Paragraph).setMaxLength(1800))
  );
}

export function actionPanel(config) {
  const embed = baseEmbed(config, '⚔️ Painel de ações', 'Crie, participe, saia, finalize ou cancele ações da facção.');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('action:create').setLabel('Criar ação').setEmoji('➕').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('action:list').setLabel('Ações abertas').setEmoji('📋').setStyle(ButtonStyle.Primary)
  );
  return { embeds: [embed], components: [row], ephemeral: true };
}

export function actionEmbed(config, action, participants = []) {
  const status = action.status === 'open' ? 'Aberta' : 'Finalizada';
  const embed = baseEmbed(config, `⚔️ ${action.name}`, action.observation || 'Sem observação.');
  embed.addFields(
    { name: '📅 Data', value: `${action.action_date} às ${action.action_time}`, inline: true },
    { name: '👑 Organizador', value: `<@${action.organizer_id}>`, inline: true },
    { name: '📌 Status', value: status, inline: true },
    { name: '👥 Participantes', value: `${participants.length}/${action.max_participants}`, inline: true },
    { name: 'Lista', value: participants.length ? participants.map((p, i) => `${i + 1}. <@${p.user_id}>`).join('\n').slice(0, 1024) : 'Ninguém entrou ainda.' }
  );
  if (action.result) embed.addFields({ name: 'Resultado', value: `${action.result} • ${money(action.profit_loss)}` });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`action:join:${action.id}`).setLabel('Participar').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(action.status !== 'open'),
    new ButtonBuilder().setCustomId(`action:leave:${action.id}`).setLabel('Sair').setEmoji('↩️').setStyle(ButtonStyle.Secondary).setDisabled(action.status !== 'open'),
    new ButtonBuilder().setCustomId(`action:finishbtn:${action.id}`).setLabel('Finalizar').setEmoji('🏁').setStyle(ButtonStyle.Primary).setDisabled(action.status !== 'open'),
    new ButtonBuilder().setCustomId(`action:cancel:${action.id}`).setLabel('Cancelar').setEmoji('🛑').setStyle(ButtonStyle.Danger).setDisabled(action.status !== 'open')
  );
  return { embeds: [embed], components: [row] };
}

export function approvalComponents(id) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`register:approve:${id}`).setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`register:refusebtn:${id}`).setLabel('Recusar').setEmoji('❌').setStyle(ButtonStyle.Danger)
  )];
}

export function configPanel(config) {
  const embed = baseEmbed(config, '⚙️ Painel administrativo', 'Selecione uma área para personalizar a facção. Apenas liderança pode usar.');
  embed.addFields(
    { name: 'Identidade', value: `${config.faction_name} • ${config.embed_color}`, inline: true },
    { name: 'Metas', value: `Individual: ${config.individual_farm_goal} • Geral: ${config.general_farm_goal}`, inline: true },
    { name: 'Nick', value: config.nickname_format, inline: true }
  );
  const menu = new StringSelectMenuBuilder().setCustomId('config:menu').setPlaceholder('Escolha o que configurar').addOptions(
    { label: 'Nome, cor, banner e ícone', value: 'identity', emoji: '🎨' },
    { label: 'Cargos e permissões', value: 'roles', emoji: '🛡️' },
    { label: 'Canais e categorias', value: 'channels', emoji: '📁' },
    { label: 'Canais de logs', value: 'logs', emoji: '📜' },
    { label: 'Metas de farm', value: 'goals', emoji: '🎯' },
    { label: 'Ações, vendas e compras', value: 'lists', emoji: '📋' },
    { label: 'Formato de nick', value: 'nick', emoji: '🏷️' },
    { label: 'Mensagens e botões', value: 'messages', emoji: '💬' }
  );
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true };
}

export const channelOptions = { type: ChannelType.GuildText, permissionOverwrites: [] };
export const adminPermission = PermissionFlagsBits.ManageGuild;
