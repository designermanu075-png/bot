# Guia de hospedagem na Discloud

Este guia mostra o passo a passo para hospedar o bot na Discloud usando o arquivo `discloud.config` incluído no projeto.

## 1. Preparar o projeto

Antes de enviar para a Discloud, confirme que estes arquivos existem na raiz do projeto:

- `index.js`, ponto de entrada usado pela Discloud.
- `package.json`, com scripts e dependências do bot.
- `discloud.config`, com as configurações da aplicação.
- `.env.example`, modelo das variáveis necessárias.
- Pasta `src/`, com o código principal do bot.

## 2. Configurar `discloud.config`

O projeto já inclui um arquivo pronto:

```ini
NAME=Bot Facção
TYPE=bot
MAIN=index.js
RAM=100
VERSION=latest
```

Se você estiver usando o **Quick Setup do Bot do Discord**, não precisa criar esse arquivo manualmente. O bot do Discord da Discloud solicitará essas informações durante o processo.

### O que cada campo significa

| Campo | Valor | Descrição |
| --- | --- | --- |
| `NAME` | `Bot Facção` | Nome da aplicação dentro da Discloud. |
| `TYPE` | `bot` | Informa que a aplicação é um bot. |
| `MAIN` | `index.js` | Arquivo que a Discloud executa para ligar o bot. |
| `RAM` | `100` | Memória inicial em MB. Aumente se o servidor crescer. |
| `VERSION` | `latest` | Usa a versão mais recente disponível do ambiente Node.js na Discloud. |

## 3. Configurar variáveis de ambiente

Nunca coloque o token do bot dentro de `discloud.config` ou em arquivos enviados para repositório público.

Configure as variáveis abaixo no painel da Discloud ou pelo fluxo de envio do bot da Discloud:

```env
DISCORD_TOKEN=token_do_bot
CLIENT_ID=id_da_aplicacao
GUILD_ID=id_do_servidor_para_registro_rapido
DATABASE_PATH=./data/faccao.sqlite
REGISTER_COMMANDS_ON_READY=false
TIMEZONE=America/Sao_Paulo
```

### Obrigatórias

- `DISCORD_TOKEN`: token do bot no Discord Developer Portal.
- `CLIENT_ID`: Application ID do bot.

### Recomendadas

- `GUILD_ID`: registra comandos rapidamente em um servidor específico durante setup/teste.
- `DATABASE_PATH`: caminho do SQLite persistente.
- `REGISTER_COMMANDS_ON_READY`: deixe `false` em produção se você usa `npm run deploy` antes de subir.
- `TIMEZONE`: fuso usado na documentação e relatórios.

## 4. Registrar os slash commands

Você tem duas opções:

### Opção A — localmente antes do upload

No seu computador/VPS, configure `.env` e execute:

```bash
npm install
npm run deploy
```

Depois envie o projeto para a Discloud.

### Opção B — automaticamente ao iniciar

Altere a variável:

```env
REGISTER_COMMANDS_ON_READY=true
```

Depois de o bot ficar online e registrar os comandos, você pode voltar para `false` para evitar deploy repetido a cada reinício.

## 5. Enviar para a Discloud

### Pelo bot da Discloud no Discord

1. Compacte o projeto em `.zip` contendo a raiz do bot.
2. Envie o arquivo pelo fluxo indicado pelo bot da Discloud.
3. Informe os dados do `discloud.config` quando solicitado ou deixe o arquivo pronto na raiz.
4. Configure as variáveis de ambiente solicitadas.
5. Inicie a aplicação.

### Pela CLI da Discloud

Se você usa a CLI, rode na raiz do projeto:

```bash
discloud upload
```

Depois acompanhe os logs:

```bash
discloud logs
```

## 6. Conferir se iniciou corretamente

Ao iniciar com sucesso, os logs devem mostrar:

```text
✅ Bot online como NomeDoBot#0000
```

Se aparecer `Configure DISCORD_TOKEN no arquivo .env.`, a variável `DISCORD_TOKEN` não foi configurada no ambiente da Discloud.

## 7. Pós-instalação no Discord

1. Convide o bot com permissões de `applications.commands`, gerenciar cargos, gerenciar apelidos, gerenciar canais, enviar mensagens e embeds.
2. Use `/config` para configurar cargos, canais, categorias, logs e metas.
3. Use `/painel` no canal principal da facção.
4. Teste `/registro` com um usuário comum.
5. Aprove o registro com um cargo de recrutador/liderança.
6. Confirme se o nick, cargo, canal/tópico de farm e logs foram criados corretamente.

## 8. Banco de dados e backups

O banco SQLite fica no caminho definido em `DATABASE_PATH`, por padrão:

```text
./data/faccao.sqlite
```

Use `/backup` dentro do Discord para exportar os dados da facção em JSON. Faça backups antes de mudanças grandes de configuração ou migração de hospedagem.

## 9. Problemas comuns

| Problema | Causa provável | Solução |
| --- | --- | --- |
| Bot liga, mas comandos não aparecem | Slash commands não registrados | Rode `npm run deploy` ou use `REGISTER_COMMANDS_ON_READY=true` temporariamente. |
| Registro aprova, mas cargo não aplica | Hierarquia de cargos | Coloque o cargo do bot acima do cargo de membro. |
| Canal de farm não cria | Falta permissão de gerenciar canais | Revise permissões do bot e categoria configurada. |
| Banco reinicia vazio após redeploy | Caminho de dados não persistente | Confirme `DATABASE_PATH` e use `/backup` regularmente. |
| Erro de token | Variável ausente/incorreta | Reconfigure `DISCORD_TOKEN` na Discloud. |
