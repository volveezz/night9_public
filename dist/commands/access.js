import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Command } from "../structures/command.js";
import { updateChannelPermissionsForUser } from "../utils/discord/updateChannelPermissionsForUser.js";
const SlashCommand = new Command({
    name: "access",
    nameLocalizations: { ru: "доступ" },
    description: "Receive access to a specific text channel of the guild",
    descriptionLocalizations: { ru: "Получите доступ к определенным каналам сервера" },
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "channel",
            nameLocalizations: { ru: "канал" },
            description: "The text channel you want to receive access to",
            descriptionLocalizations: { ru: "Текстовый канал, к которому вы хотите получить доступ" },
            required: true,
            choices: [
                {
                    name: "NSFW Channel",
                    value: process.env.NSFW_CHANNEL_ID,
                    nameLocalizations: { ru: "+18 канал" },
                },
                {
                    name: "Destiny Lore",
                    value: process.env.LORE_CHANNEL_ID,
                    nameLocalizations: { ru: "Обсуждение игрового лора" },
                },
                {
                    name: "Vex Incursions",
                    value: process.env.VEX_INCURSION_CHANNEL_ID,
                    nameLocalizations: { ru: "Вторжения вексов" },
                },
                {
                    name: "Checkpoints",
                    value: process.env.CHECKPOINTS_CHANNEL_ID,
                    nameLocalizations: { ru: "Контрольные точки" },
                },
                {
                    name: "The First Descendant",
                    value: "1153427799533699185",
                },
            ],
        },
    ],
    run: async ({ client, interaction, args }) => {
        const channelId = args.getString("channel", true);
        const channel = await client.getTextChannel(channelId);
        const permissionsStatus = !channel.permissionsFor(interaction.user.id)?.has("ViewChannel");
        if (channelId === "1153427799533699185") {
            const tfd_news = await client.getTextChannel("1153427973018501120");
            if (permissionsStatus) {
                channel.permissionOverwrites.create(interaction.user.id, { ViewChannel: true });
                tfd_news.permissionOverwrites.create(interaction.user.id, { ViewChannel: true });
            }
            else {
                channel.permissionOverwrites.delete(interaction.user.id);
                tfd_news.permissionOverwrites.delete(interaction.user.id);
            }
        }
        else {
            await updateChannelPermissionsForUser(channel, interaction.user.id, permissionsStatus);
        }
        const embed = new EmbedBuilder().setColor(permissionsStatus ? colors.success : colors.error).setAuthor({
            name: `Вы ${permissionsStatus ? "получили" : "забрали свой"} доступ к каналу ${channel.name}`,
            iconURL: permissionsStatus ? icons.success : icons.close,
        });
        interaction.reply({ embeds: [embed], ephemeral: true });
    },
});
export default SlashCommand;
//# sourceMappingURL=access.js.map