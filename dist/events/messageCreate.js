import { EmbedBuilder, Message } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import { Event } from "../structures/event.js";
import { adminDmChnManager } from "../utils/discord/adminDmManager.js";
import { dmHandler } from "../utils/discord/dmHandler.js";
import { patchnoteGenerator } from "../utils/discord/patchnoteGenerator.js";
import { pvePartyHandler } from "../utils/discord/pvePartyHandler.js";
import { sendRegistrationLink } from "../utils/discord/registration.js";
import { userActivityCacher } from "../utils/discord/userActivityHandler.js";
export default new Event("messageCreate", async (message) => {
    try {
        if (!message.author || message.author.bot || message.system || !(message instanceof Message))
            return;
        if (message.channelId === ids.patchGeneratorChnId)
            return patchnoteGenerator(message);
        if (message.channelId === ids.pvePartyChnId)
            pvePartyHandler(message);
        if (message.channel.isDMBased()) {
            if (message.content === "/init" || message.content === "!init" || message.content.endsWith("init"))
                return message.channel.send({ embeds: [await sendRegistrationLink(message)] });
            return dmHandler(message);
        }
        if (ids.dmMsgsChnId === message.channelId && message.member?.permissions.has("Administrator"))
            return adminDmChnManager(message);
        if (!message.member?.roles.cache.has(statusRoles.verified))
            return;
        userActivityCacher({ userId: message.author.id, messageId: message.id });
    }
    catch (error) {
        const embed = new EmbedBuilder()
            .setColor(colors.error)
            .setTitle(error.name || "Произошла ошибка")
            .setDescription(error.description || error.message || null);
        console.error(`[Error code: 1217] Got message error`, error, message.author.username);
        return message.reply({ embeds: [embed] }).then((m) => setTimeout(() => m.delete(), 5000));
    }
});
