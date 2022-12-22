import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildChannel = client.channels.cache.get(ids.guildChnId);
export default new Event("guildUpdate", async (oldGuild, newGuild) => {
    const embed = new EmbedBuilder().setColor(colors.default).setAuthor({
        name: "Сервер обновлен",
    });
    if (oldGuild.name !== newGuild.name)
        embed.addFields([
            {
                name: "Название сервера обновлено",
                value: `\`${oldGuild.name}\` -> \`${newGuild.name}\``,
            },
        ]);
    if (oldGuild.icon !== newGuild.icon)
        embed.addFields([
            {
                name: "Иконка обновлена",
                value: String(`[До изменения](${oldGuild.iconURL() || "https://natribu.org/"}) -> [После](${newGuild.iconURL() || "https://natribu.org/"})`),
            },
        ]);
    if (oldGuild.premiumTier !== newGuild.premiumTier)
        embed.addFields([
            {
                name: "Статус буста сервера обновлен",
                value: `\`${oldGuild.premiumTier}\` -> \`${newGuild.premiumTier}\``,
            },
        ]);
    if (oldGuild.ownerId !== newGuild.ownerId)
        embed.addFields([
            {
                name: "Владелец сервера обновлен",
                value: String(await newGuild.fetchOwner().then((own) => `\`` + own.displayName + `\``)),
            },
        ]);
    guildChannel.send({ embeds: [embed] });
});
