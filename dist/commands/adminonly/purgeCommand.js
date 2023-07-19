import { ApplicationCommandOptionType, ChannelType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { Command } from "../../structures/command.js";
export default new Command({
    name: "purge",
    description: "Удаление нескольких сообщений одной командой",
    descriptionLocalizations: {
        "en-US": "Deleting multiple messages with one command",
        "en-GB": "Deleting multiple messages with one command",
    },
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Integer,
            name: "amount",
            nameLocalizations: { ru: "количество" },
            description: "Укажите количество сообщений для удаления",
            descriptionLocalizations: {
                "en-GB": "Specify the number of messages to delete",
                "en-US": "Specify the number of messages to delete",
            },
            required: true,
            minValue: 1,
            maxValue: 100,
        },
        {
            type: ApplicationCommandOptionType.User,
            name: "user",
            nameLocalizations: { ru: "пользователь" },
            description: "Укажите пользователя, сообщения которого удаляем",
            descriptionLocalizations: {
                "en-GB": "Specify the user whose messages we are deleting",
                "en-US": "Specify the user whose messages we are deleting",
            },
        },
    ],
    run: async ({ interaction, args }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText)
            return;
        const msgs = args.getInteger("amount", true);
        const user = args.getUser("user");
        if (!msgs || msgs > 100) {
            const embed = new EmbedBuilder()
                .setColor(colors.error)
                .setTitle("Параметр `количество` должен быть больше или равен 1 и меньше 100");
            await deferredReply;
            return interaction.editReply({ embeds: [embed] });
        }
        if (user) {
            const fetched = await interaction.channel.messages.fetch({ limit: msgs }).then((response) => {
                return response
                    .filter((message) => message.author.id === user.id)
                    .filter((msg) => msg.createdTimestamp > Date.now() - 60 * 1000 * 60 * 24 * 14);
            });
            interaction.channel
                .bulkDelete(fetched)
                .then(async (response) => {
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle(`${response.size} сообщений ${user.username} были удалены`);
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
            })
                .catch(async (e) => {
                console.error("[Error code: 1649]", e);
                const embed = new EmbedBuilder().setColor(colors.error).setTitle(`Error: ${e.code}`).setDescription(e.toString());
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
                return;
            });
        }
        else {
            const msgArray = await interaction.channel.messages.fetch({ limit: msgs }).then((m) => {
                return m.filter((msg) => msg.createdTimestamp > Date.now() - 60 * 1000 * 60 * 24 * 14);
            });
            interaction.channel
                .bulkDelete(msgArray)
                .then(async (response) => {
                const embed = new EmbedBuilder().setColor(colors.success).setTitle(`${response.size} сообщений были удалены`);
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
                return;
            })
                .catch(async (e) => {
                console.error("[Error code: 1648]", e);
                const embed = new EmbedBuilder().setColor(colors.error).setTitle(`Error: ${e.code}`).setDescription(e.toString());
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
                return;
            });
        }
    },
});
//# sourceMappingURL=purgeCommand.js.map