import { BotClient } from "../index.js";
import { ids } from "../base/ids.js";
import { statusRoles } from "../base/roles.js";
import { adminDmChnManager } from "./adminDmChnManager.js";
import { dmHandler } from "./dmHandler.js";
import { patchnoteGenerator } from "./patchnoteGen.js";
import { pvePartyHandler } from "./pvePartyHandler.js";
import { discord_activities } from "./sequelize.js";
BotClient.on("messageCreate", async (message) => {
    if (message.author.bot)
        return;
    if (message.channelId === ids.patchGeneratorChnId)
        return patchnoteGenerator(message);
    if (message.channelId === ids.pvePartyChnId)
        return pvePartyHandler(message);
    if (message.channel.isDMBased())
        return dmHandler(message);
    if (message.member?.permissions.has("Administrator") && ids.dmMsgsChnId === message.channelId)
        return adminDmChnManager(message);
    if (!message.member?.roles.cache.has(statusRoles.verified))
        return;
    discord_activities
        .increment("messages", { by: 1, where: { authDatumDiscordId: message.author.id } })
        .catch((e) => console.log(`[Error code: 1110] Error during updating discordActivity for ${message.member?.displayName}`, e));
    return;
});
