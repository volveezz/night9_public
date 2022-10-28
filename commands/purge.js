import { ChannelType, EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
export default {
    name: "purge",
    description: "Удаляет пачку сообщений за одну команду",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Integer,
            name: "messages",
            nameLocalizations: { ru: "количество" },
            description: "Количество сообщений для удаления",
            required: true,
            min_value: 1,
            max_value: 100,
        },
        {
            type: ApplicationCommandOptionType.User,
            name: "user",
            nameLocalizations: { ru: "пользователь" },
            description: "Пользователь, сообщения которого удаляем",
        },
    ],
    callback: async (_client, interaction, _member, _guild, _channel) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText)
            return;
        const msgs = interaction.options.getInteger("messages");
        const user = interaction.options.getUser("user");
        if (!msgs || msgs > 100) {
            const embed = new EmbedBuilder().setColor("Red").setTitle(`Параметр "сообщений" должен быть больше или равен 1 и меньше 100`);
            await deferredReply;
            return interaction.editReply({ embeds: [embed] });
        }
        if (user) {
            const fetched = await interaction.channel?.messages.fetch({ limit: msgs }).then((response) => {
                return response
                    .filter((message) => message.author.id === user.id)
                    .filter((msg) => msg.createdTimestamp > new Date().getTime() - 60 * 1000 * 60 * 24 * 14);
            });
            interaction.channel
                .bulkDelete(fetched)
                .then(async (response) => {
                const embed = new EmbedBuilder().setColor("Green").setTitle(`${response.size} сообщений ${user.username} были удалены`);
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
            })
                .catch(async (e) => {
                console.log(e);
                const embed = new EmbedBuilder().setColor("Red").setTitle(`Error: ${e.code}`).setDescription(e.toString());
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
                return;
            });
        }
        else {
            const msgArray = await interaction.channel.messages.fetch({ limit: msgs }).then((m) => {
                return m.filter((msg) => msg.createdTimestamp > new Date().getTime() - 60 * 1000 * 60 * 24 * 14);
            });
            interaction.channel
                .bulkDelete(msgArray)
                .then(async (response) => {
                const embed = new EmbedBuilder().setColor("Green").setTitle(`${response.size} сообщений были удалены`);
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
                return;
            })
                .catch(async (e) => {
                console.log(e);
                const embed = new EmbedBuilder().setColor("Red").setTitle(`Error: ${e.code}`).setDescription(e.toString());
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
                return;
            });
        }
    },
};
