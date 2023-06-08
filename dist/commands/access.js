import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { channelIds } from "../configs/ids.js";
import { Command } from "../structures/command.js";
export default new Command({
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
                    value: channelIds.nsfw,
                    nameLocalizations: { ru: "+18 канал" },
                },
                {
                    name: "Destiny Lore Channel",
                    value: channelIds.lore,
                    nameLocalizations: { ru: "Канал с обсуждением игрового лора" },
                },
            ],
        },
    ],
    run: async ({ client, interaction, args }) => {
        const channelId = args.getString("channel", true);
        const channel = await client.getAsyncTextChannel(channelId);
        const permissionsStatus = !channel.permissionsFor(interaction.user.id)?.has("ViewChannel");
        if (permissionsStatus) {
            await channel.permissionOverwrites.create(interaction.user.id, {
                ViewChannel: true,
                ReadMessageHistory: true,
                SendMessages: true,
            });
        }
        else {
            await channel.permissionOverwrites.delete(interaction.user.id);
        }
        const embed = new EmbedBuilder().setColor(permissionsStatus ? colors.success : colors.error).setAuthor({
            name: `Вы ${permissionsStatus ? "получили" : "забрали свой"} доступ к каналу ${channel.name}`,
            iconURL: permissionsStatus ? icons.success : icons.close,
        });
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
});