import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildChannel = client.channels.cache.get(ids.guildChnId);
export default new Event("roleCreate", (role) => {
    const embed = new EmbedBuilder()
        .setColor(colors.default)
        .setAuthor({ name: "Роль была создана" })
        .setFooter({ text: `RoleId: ${role.id}` })
        .addFields([
        { name: "Роль", value: `<@&${role.id}>`, inline: true },
        { name: "Название", value: role.name, inline: true },
        { name: "Цвет", value: role.hexColor, inline: true },
    ]);
    guildChannel.send({ embeds: [embed] });
});
