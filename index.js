require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Estoque em memória para começar.
// Depois podemos trocar por banco de dados.
const estoque = [];

const commands = [
  new SlashCommandBuilder()
    .setName("loja")
    .setDescription("Mostra as contas/produtos disponíveis"),

  new SlashCommandBuilder()
    .setName("adicionar")
    .setDescription("Adiciona um produto ao estoque")
    .addStringOption(o =>
      o.setName("nome").setDescription("Nome do produto").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("preco").setDescription("Preço em centavos (ex.: 2500 = R$25,00)").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName("remover")
    .setDescription("Remove um produto do estoque")
    .addIntegerOption(o =>
      o.setName("id").setDescription("ID do produto").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName("produto")
    .setDescription("Mostra detalhes de um produto")
    .addIntegerOption(o =>
      o.setName("id").setDescription("ID do produto").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("vendas")
    .setDescription("Mostra instruções para registrar uma venda")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(c => c.toJSON());

async function registrarComandos() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log("Comandos registrados no servidor.");
}

client.once("ready", async () => {
  console.log(`Contas Bot online como ${client.user.tag}`);
  try {
    await registrarComandos();
  } catch (err) {
    console.error("Erro ao registrar comandos:", err);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "loja") {
    if (!estoque.length) {
      return interaction.reply("📦 O estoque está vazio no momento.");
    }

    const embed = new EmbedBuilder()
      .setTitle("🛒 Contas Bot — Loja")
      .setDescription(
        estoque.map(p =>
          `**#${p.id} — ${p.nome}**\n💰 R$ ${(p.preco / 100).toFixed(2).replace(".", ",")}`
        ).join("\n\n")
      );

    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "adicionar") {
    const nome = interaction.options.getString("nome");
    const preco = interaction.options.getInteger("preco");

    const id = estoque.length
      ? Math.max(...estoque.map(p => p.id)) + 1
      : 1;

    estoque.push({ id, nome, preco });

    return interaction.reply(
      `✅ Produto **#${id}** adicionado ao estoque.\n` +
      `📦 ${nome}\n` +
      `💰 R$ ${(preco / 100).toFixed(2).replace(".", ",")}`
    );
  }

  if (interaction.commandName === "remover") {
    const id = interaction.options.getInteger("id");
    const index = estoque.findIndex(p => p.id === id);

    if (index === -1) {
      return interaction.reply("❌ Produto não encontrado.");
    }

    const [produto] = estoque.splice(index, 1);
    return interaction.reply(`🗑️ Produto **#${produto.id} — ${produto.nome}** removido.`);
  }

  if (interaction.commandName === "produto") {
    const id = interaction.options.getInteger("id");
    const produto = estoque.find(p => p.id === id);

    if (!produto) return interaction.reply("❌ Produto não encontrado.");

    const embed = new EmbedBuilder()
      .setTitle(`📦 Produto #${produto.id}`)
      .addFields(
        { name: "Produto", value: produto.nome, inline: true },
        { name: "Preço", value: `R$ ${(produto.preco / 100).toFixed(2).replace(".", ",")}`, inline: true },
        { name: "Compra", value: "Abra um ticket com a equipe para concluir a compra." }
      );

    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "vendas") {
    return interaction.reply(
      "🧾 **Fluxo de venda**\n" +
      "1. Cliente escolhe um produto com `/loja`.\n" +
      "2. Cliente abre um ticket.\n" +
      "3. A equipe confirma o pagamento.\n" +
      "4. A entrega é feita manualmente pela equipe.\n\n" +
      "⚠️ Não coloque senhas, tokens ou outros dados de acesso diretamente no código ou em canais públicos."
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
