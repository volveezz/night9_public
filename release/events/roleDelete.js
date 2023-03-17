import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildChannel = client.channels.cache.get(ids.guildChnId);
export default new Event("roleDelete", (role) => {
    const embed = new EmbedBuilder()
        .setColor(colors.kicked)
        .setAuthor({
        name: "Роль удалена",
        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086267623534231705/3125-icon-modshield.png",
    })
        .setDescription(`Удаленная роль \`${role.name}\` (${role.id})`)
        .addFields([
        {
            name: "Дата создания",
            value: `<t:${Math.round(role.createdAt.getTime() / 1000)}>`,
        },
    ]);
    guildChannel.send({ embeds: [embed] });
});
