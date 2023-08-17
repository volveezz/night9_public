import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, RESTJSONErrorCodes, } from "discord.js";
import colors from "../../../../configs/colors.js";
import icons from "../../../../configs/icons.js";
import { client } from "../../../../index.js";
import { default as readinessInstance, default as readinessSystemInstance } from "../../../../structures/RaidReadinessSystem.js";
import { RaidEvent } from "../../../persistence/sequelize.js";
import { addButtonsToMessage } from "../../addButtonsToMessage.js";
import nameCleaner from "../../nameClearer.js";
import getRaidEventData from "../getRaidEventData.js";
import { raidEmitter } from "../raidEmitter.js";
const { GUILD_ID, RAID_CHANNEL_ID } = process.env;
const generateEmbed = ({ raid, id, messageId }) => {
    return [
        new EmbedBuilder()
            .setColor(colors.deepBlue)
            .setAuthor({
            name: `Проверка готовности к рейду ${id}-${raid}`,
            iconURL: icons.mark,
            url: `https://discord.com/channels/${GUILD_ID}/${RAID_CHANNEL_ID}/${messageId}`,
        })
            .setDescription(`Подтвердите свою готовность к рейду, который начнется через час`),
    ];
};
const components = [
    new ButtonBuilder().setCustomId("raidReadiness_ready").setLabel("Буду готов к началу").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("raidReadiness_willBeReady").setLabel("Немного опоздаю").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("raidReadiness_wontBeReady").setLabel("Не смогу прийти").setStyle(ButtonStyle.Danger),
];
raidEmitter.on("deleted", (raidData) => {
    const collectors = raidCollectors.get(raidData.id);
    if (!collectors)
        return;
    collectors.forEach((collector) => collector.stop());
});
export async function stopAllRaidReadinessCollectors() {
    raidCollectors.forEach((perRaidCollectors) => {
        perRaidCollectors.forEach((perUserCollector) => perUserCollector.stop());
    });
}
const raidCollectors = new Map();
const notifiedUsersAboutClosedDM = new Set();
export async function askRaidReadinessNotification(discordId, raidId) {
    const member = client.getCachedMembers().get(discordId) || (await client.getAsyncMember(discordId));
    const raidEventData = await getRaidEventData(raidId);
    if (!raidEventData) {
        console.error("[Error code: 1985] Raid wasn't found", raidId);
        return;
    }
    const embeds = generateEmbed(raidEventData);
    const message = await member.send({ embeds, components: addButtonsToMessage(components) }).catch(async (e) => {
        if (e.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
            const errorEmbed = new EmbedBuilder()
                .setColor(colors.error)
                .setAuthor({ name: `${nameCleaner(member.displayName)}, откройте свои личные сообщения` })
                .setDescription("Поскольку у вас закрытые личные сообщения, то вы не можете получить систему готовности к рейду, из-за чего вы считаетесь как неготовый участник");
            const raidChannel = client.getCachedTextChannel(raidEventData.channelId) || (await client.getAsyncTextChannel(raidEventData.channelId));
            raidChannel.send({ embeds: [errorEmbed] });
            notifiedUsersAboutClosedDM.add(discordId);
            setTimeout(async () => {
                const updatedRaidData = await RaidEvent.findOne({ where: { id: raidId }, attributes: ["id", "time"] });
                if (updatedRaidData?.time !== raidEventData.time)
                    return;
                askRaidReadinessNotification(discordId, raidId);
            }, 60 * 1000 * 5);
        }
        else {
            console.error("[Error code: 1986]", e);
        }
    });
    if (!message)
        return;
    const collectorTime = raidEventData.time * 1000 - Date.now();
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === discordId,
        time: collectorTime,
    });
    if (!raidCollectors.has(raidId)) {
        raidCollectors.set(raidId, []);
        await readinessInstance.updateReadinessMessage(raidId);
    }
    const raidCollectorsArray = raidCollectors.get(raidId);
    if (raidCollectorsArray) {
        raidCollectorsArray.push(collector);
    }
    collector.on("collect", (i) => {
        readinessSystemInstance.setUserReadinessStatus({ button: i.customId, discordId, raidId });
        const readinessReplyEmbed = new EmbedBuilder().setColor(colors.success).setAuthor({
            name: `Вы подтвердили свою ${i.customId === "raidReadiness_wontBeReady" ? "неготовность" : "готовность"} к рейду`,
            iconURL: icons.success,
        });
        if (i.customId === "raidReadiness_willBeReady") {
            const components = [
                new ButtonBuilder()
                    .setCustomId("modalRaidReadiness_lateReason" + `_${raidId}`)
                    .setLabel("Указать причину и время опоздания")
                    .setStyle(ButtonStyle.Secondary),
            ];
            i.reply({ embeds: [readinessReplyEmbed], components: addButtonsToMessage(components), ephemeral: true });
            return;
        }
        i.reply({ embeds: [readinessReplyEmbed], ephemeral: true });
    });
    collector.on("end", (_, r) => {
        message.delete();
        if (raidCollectorsArray) {
            const index = raidCollectorsArray.indexOf(collector);
            if (index !== -1) {
                raidCollectorsArray.splice(index, 1);
            }
        }
    });
}
//# sourceMappingURL=askUserRaidReadiness.js.map