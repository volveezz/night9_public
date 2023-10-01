import { EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import nameCleaner from "../general/nameClearer.js";
let authLogChannel = null;
export async function logUserRegistrationAttempt(state, user, isNewUser) {
    const memberDisplayName = nameCleaner((client.getCachedMembers().get(user.id) || (await client.getMember(user.id))).displayName);
    const embed = new EmbedBuilder()
        .setColor(colors.serious)
        .setAuthor({
        name: `${memberDisplayName} начал регистрацию`,
        iconURL: user.displayAvatarURL(),
    })
        .addFields([
        { name: "Пользователь", value: `<@${user.id}>`, inline: true },
        { name: "State", value: `${state}`, inline: true },
        { name: "Впервые", value: `${isNewUser}`, inline: true },
    ]);
    if (!authLogChannel)
        authLogChannel =
            client.getCachedTextChannel(process.env.BOT_CHANNEL_ID) || (await client.getTextChannel(process.env.BOT_CHANNEL_ID));
    await authLogChannel.send({ embeds: [embed] });
}
//# sourceMappingURL=logUserRegistration.js.map