# Guia de personalização

## Formatos aceitos no `/config`

### Nome, cor, banner e ícone

```text
Nome da Facção | #8A2BE2 | https://banner.png | https://icone.png
```

### Cargos e permissões

```text
cargo_membro | cargo_recrutador_1,cargo_recrutador_2 | cargo_lider_1 | cargo_financeiro_1
```

Também é possível colar menções de cargos; o bot remove `<@&...>` automaticamente.

### Canais e categorias

```text
canal_aprovacao | canal_suporte | categoria_farm | forum_farm
```

Se `forum_farm` for um canal de fórum, o bot cria tópicos. Caso contrário, cria canais de texto na categoria configurada.

### Logs

```text
registros_pendentes=canal_id
registros_aprovados=canal_id
registros_recusados=canal_id
farm=canal_id
acoes=canal_id
vendas=canal_id
compras=canal_id
financeiro=canal_id
admin=canal_id
geral=canal_id
```

### Metas de farm

```text
1000 | 50000
```

### Tipos de ação, itens de venda e itens de compra

```text
Banco,Joalheria,Dominação | Pólvora,Peças,Armas | Colete,Kit,Radio
```

### Formato de nick

```text
{id} | {nome}
```

### Mensagens e botões

```text
panelText=Bem-vindo ao painel da facção.
register=Registrar-se
farm=Farm
actions=Ações
sales=Vendas
purchases=Compras
finance=Financeiro
ranking=Ranking
me=Meus dados
support=Suporte
```
