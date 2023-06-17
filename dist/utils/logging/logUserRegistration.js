import { EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { channelIds } from "../../configs/ids.js";
import { client } from "../../index.js";
const authLogChannel = await client.getAsyncTextChannel(channelIds.bot);
export async function logUserRegistrationAttempt(state, user, isNewUser) {
    const embed = new EmbedBuilder()
        .setColor(colors.serious)
        .setAuthor({
        name: `${user.username} начал регистрацию`,
        iconURL: user.displayAvatarURL({ forceStatic: false }),
    })
        .addFields([
        { name: "Пользователь", value: `<@${user.id}>`, inline: true },
        { name: "State", value: `${state}`, inline: true },
        { name: "Впервые", value: `${isNewUser}`, inline: true },
    ]);
    await authLogChannel.send({ embeds: [embed] });
}
