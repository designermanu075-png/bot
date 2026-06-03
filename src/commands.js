import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const commandData = [
  new SlashCommandBuilder().setName('painel').setDescription('Envia o painel principal da facção.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('config').setDescription('Abre o painel administrativo de configuração.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('registro').setDescription('Abre o formulário de registro.'),
  new SlashCommandBuilder().setName('aprovar').setDescription('Aprova um registro pendente.').addIntegerOption((o) => o.setName('id').setDescription('ID do registro').setRequired(true)),
  new SlashCommandBuilder().setName('recusar').setDescription('Recusa um registro pendente.').addIntegerOption((o) => o.setName('id').setDescription('ID do registro').setRequired(true)).addStringOption((o) => o.setName('motivo').setDescription('Motivo da recusa').setRequired(true)),
  new SlashCommandBuilder().setName('membro').setDescription('Consulta o perfil de um membro.').addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),
  new SlashCommandBuilder().setName('farm').setDescription('Registrar farm ou ver ranking.').addSubcommand((s) => s.setName('registrar').setDescription('Abre o formulário de farm')).addSubcommand((s) => s.setName('ranking').setDescription('Mostra ranking de farm')),
  new SlashCommandBuilder().setName('acao').setDescription('Gerencia ações.').addSubcommand((s) => s.setName('painel').setDescription('Abre painel de ações')).addSubcommand((s) => s.setName('criar').setDescription('Abre formulário de criação')),
  new SlashCommandBuilder().setName('venda').setDescription('Registrar venda.').addSubcommand((s) => s.setName('registrar').setDescription('Abre formulário de venda')),
  new SlashCommandBuilder().setName('compra').setDescription('Registrar compra.').addSubcommand((s) => s.setName('registrar').setDescription('Abre formulário de compra')),
  new SlashCommandBuilder().setName('financeiro').setDescription('Consulta ou corrige o caixa.').addSubcommand((s) => s.setName('saldo').setDescription('Mostra saldo')).addSubcommand((s) => s.setName('corrigir').setDescription('Correção manual do caixa')),
  new SlashCommandBuilder().setName('ranking').setDescription('Mostra rankings.').addStringOption((o) => o.setName('tipo').setDescription('Tipo de ranking').setRequired(true).addChoices(
    { name: 'Farm', value: 'farm' }, { name: 'Ações', value: 'acoes' }, { name: 'Vendas', value: 'vendas' }, { name: 'Compras', value: 'compras' }, { name: 'Financeiro', value: 'financeiro' }, { name: 'Ativos', value: 'ativos' }
  )),
  new SlashCommandBuilder().setName('relatorio').setDescription('Gera relatório resumido.').addStringOption((o) => o.setName('tipo').setDescription('Tipo').setRequired(true).addChoices(
    { name: 'Farm', value: 'farm' }, { name: 'Vendas', value: 'vendas' }, { name: 'Compras', value: 'compras' }, { name: 'Financeiro', value: 'financeiro' }
  )).addUserOption((o) => o.setName('membro').setDescription('Filtrar por membro').setRequired(false)),
  new SlashCommandBuilder().setName('logs').setDescription('Mostra últimos logs do bot.').addStringOption((o) => o.setName('tipo').setDescription('Tipo de log').setRequired(false)),
  new SlashCommandBuilder().setName('backup').setDescription('Exporta backup JSON da facção.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map((command) => command.toJSON());
