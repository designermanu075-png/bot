# Bot de Facções para Discord — GTA RP/FiveM

Bot profissional, persistente e personalizável para facções de GTA RP/FiveM. Ele usa **slash commands**, **botões**, **menus**, **modais** e **embeds** para gerenciar registro, farm, ações, vendas, compras, financeiro, rankings, logs, relatórios e painel administrativo.

## Recursos principais

- Registro completo com Nome, ID, Telefone e Recrutador.
- Aprovação/recusa por recrutadores autorizados, com motivo obrigatório na recusa.
- Bloqueio de ID duplicado e persistência em SQLite.
- Alteração automática de nick no formato configurável, cargo de membro e criação de canal/tópico de farm individual.
- Painel principal com botões: Registro, Farm, Ações, Vendas, Compras, Financeiro, Ranking, Meus dados e Suporte.
- Farm com meta individual, meta geral, histórico, relatório e ranking.
- Ações com criação, entrada, saída, finalização, cancelamento, resultado, lucro/prejuízo e histórico.
- Vendas e compras com atualização automática do caixa e logs financeiros.
- Financeiro completo com entradas, saídas, saldo, histórico, relatórios e correção manual restrita.
- Rankings de farm, ações, vendas, compras, financeiro e membros ativos.
- Perfil completo de membro.
- Logs separados e configuráveis.
- Backup/exportação JSON por servidor.
- Painel `/config` totalmente editável por liderança.

## Instalação

1. Instale Node.js 20.11 ou superior.
2. Instale as dependências:

```bash
npm install
```

3. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

4. Configure `.env`:

```env
DISCORD_TOKEN=token_do_bot
CLIENT_ID=id_da_aplicacao
GUILD_ID=id_do_servidor_para_testes
DATABASE_PATH=./data/faccao.sqlite
REGISTER_COMMANDS_ON_READY=false
TIMEZONE=America/Sao_Paulo
```

5. Registre os comandos:

```bash
npm run deploy
```

6. Inicie o bot:

```bash
npm start
```


## Hospedagem na Discloud

O projeto já vem pronto para Discloud com `discloud.config` na raiz e `index.js` como ponto de entrada. Configuração incluída:

```ini
NAME=Bot Facção
TYPE=bot
MAIN=index.js
RAM=100
VERSION=latest
```

Se você usa o Quick Setup do Bot do Discord da Discloud, não precisa criar esse arquivo manualmente; o assistente solicitará essas informações. Para o passo a passo completo de upload, variáveis de ambiente, registro de comandos e solução de problemas, consulte [`docs/HOSPEDAGEM_DISCLOUD.md`](docs/HOSPEDAGEM_DISCLOUD.md).

## Permissões recomendadas do bot

- Gerenciar apelidos.
- Gerenciar cargos.
- Gerenciar canais.
- Enviar mensagens.
- Usar comandos de aplicativo.
- Incorporar links/embeds.
- Anexar arquivos.
- Ler histórico de mensagens.

O cargo do bot precisa ficar acima do cargo de membro e dos cargos que ele deve aplicar.

## Primeira configuração

1. Use `/config` como administrador/liderança.
2. Configure identidade: nome, cor HEX, banner e ícone.
3. Configure cargos: membro, recrutadores, liderança e financeiro.
4. Configure canais: aprovação, suporte, categoria de farm e fórum de farm opcional.
5. Configure logs por tipo, por exemplo:

```text
registros_pendentes=123456789
registros_aprovados=123456789
registros_recusados=123456789
farm=123456789
acoes=123456789
vendas=123456789
compras=123456789
financeiro=123456789
admin=123456789
geral=123456789
```

6. Configure metas de farm, listas de ações/itens, formato de nick e mensagens.
7. Envie o painel com `/painel` no canal desejado.

## Personalização

Tudo é salvo por servidor no banco SQLite. O painel `/config` permite editar:

- Nome da facção, cores, ícones e banners.
- Cargos e permissões.
- Canais, categorias e logs.
- Metas individuais e gerais.
- Tipos de ação, itens de venda e itens de compra.
- Formato do nick com `{id}` e `{nome}`.
- Mensagens automáticas e textos de botões.

## Lista de comandos

| Comando | Uso |
| --- | --- |
| `/painel` | Envia o painel principal da facção. |
| `/config` | Abre o painel administrativo. |
| `/registro` | Abre o formulário de registro. |
| `/aprovar id:<registro>` | Aprova registro pendente. |
| `/recusar id:<registro> motivo:<texto>` | Recusa registro pendente. |
| `/membro [usuario]` | Exibe perfil completo. |
| `/farm registrar` | Registra farm por modal. |
| `/farm ranking` | Mostra ranking de farm. |
| `/acao painel` | Abre painel de ações. |
| `/acao criar` | Cria ação por modal. |
| `/venda registrar` | Registra venda. |
| `/compra registrar` | Registra compra. |
| `/financeiro saldo` | Mostra caixa e histórico recente. |
| `/financeiro corrigir` | Corrige caixa manualmente, restrito ao financeiro/liderança. |
| `/ranking tipo:<tipo>` | Exibe ranking selecionado. |
| `/relatorio tipo:<tipo> [membro]` | Gera relatório resumido. |
| `/logs [tipo]` | Mostra logs internos. |
| `/backup` | Exporta backup JSON do servidor. |

## Banco de dados

O bot usa SQLite via `better-sqlite3`, com criação automática das tabelas em `src/database.js`. São persistidos:

- Configurações.
- Membros.
- Registros.
- Farms.
- Ações e participantes.
- Vendas.
- Compras.
- Movimentações financeiras.
- Logs/auditoria.
- Histórico geral usado em rankings e relatórios.

## Segurança operacional

- Apenas recrutadores/liderança aprovam ou recusam registros.
- Apenas liderança acessa `/config` e `/backup`.
- Apenas financeiro/liderança corrige caixa.
- Todo registro relevante gera auditoria e pode enviar log para canal configurado.
- IDs duplicados são bloqueados antes e durante a aprovação.
- Canais de farm duplicados são evitados usando o vínculo salvo no perfil do membro.
