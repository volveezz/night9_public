import { ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, } from "discord.js";
import { schedule } from "node-cron";
import { Op } from "sequelize";
import { RaidButtons } from "../../../configs/Buttons.js";
import colors from "../../../configs/colors.js";
import icons from "../../../configs/icons.js";
import { categoryIds, channelIds, guildId } from "../../../configs/ids.js";
import { client } from "../../../index.js";
import { nonRegClanMembers, recentlyExpiredAuthUsersBungieIds } from "../../persistence/dataStore.js";
import { RaidEvent, RaidUserNotification } from "../../persistence/sequelize.js";
import { addButtonsToMessage } from "../addButtonsToMessage.js";
import { completedRaidsData } from "../destinyActivityChecker.js";
import nameCleaner from "../nameClearer.js";
import { generateRaidClearsText, getRaidData } from "../raidFunctions.js";
import { getRandomGIF, getRandomRaidGIF, timer } from "../utilities.js";
import raidFireteamChecker from "./raidFireteamChecker.js";
schedule("0 23 * * *", () => {
    raidInvites.clear();
    nonRegClanMembers.clear();
    recentlyExpiredAuthUsersBungieIds.clear();
    raidFireteamChecker();
    tasks = [];
    while (runningTimeouts.length > 0) {
        const timeout = runningTimeouts.shift();
        clearTimeout(timeout.timeout);
    }
    loadNotifications();
});
let tasks = [];
let runningTimeouts = [];
async function scheduleNextNotification() {
    if (tasks.length === 0) {
        return console.debug(`[DEBUG 7] No more notifications to send.`);
    }
    tasks.sort((a, b) => a.notifyTime - b.notifyTime);
    const nextTask = tasks.shift();
    const sleepDuration = nextTask.notifyTime - Date.now();
    if (sleepDuration > 0) {
        console.debug(`[DEBUG 2] Next notification in ${sleepDuration}ms.`);
        const timeout = setTimeout(async () => {
            await sendNotification(nextTask);
        }, sleepDuration);
        runningTimeouts.push({ discordId: nextTask.discordId, timeout });
    }
}
async function sendNotification(task) {
    const workingTask = runningTimeouts.findIndex((t) => t.discordId === task.discordId);
    const workTimeout = runningTimeouts[workingTask].timeout;
    if (workTimeout) {
        clearTimeout(workTimeout);
        runningTimeouts = [...runningTimeouts.slice(0, workingTask), ...runningTimeouts.slice(workingTask + 1)];
    }
    const raid = await RaidEvent.findByPk(task.raidId, { attributes: ["id", "time", "joined"] });
    if (!raid) {
        console.debug(`[DEBUG 11] Raid ${task.raidId} not found.`);
        clearNotifications(task.raidId);
        return;
    }
    if (!raid.joined.includes(task.discordId)) {
        return;
    }
    await raidAnnounce(raid, task.discordId);
    scheduleNextNotification();
}
export async function loadNotifications() {
    const raidsInNextDay = await RaidEvent.findAll({
        where: {
            time: {
                [Op.gte]: Math.floor(Date.now() / 1000),
                [Op.lt]: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000),
            },
        },
    });
    const raidUserNotifications = [];
    for (const raid of raidsInNextDay) {
        const users = [...new Set([...raid.joined])];
        for (const discordId of users) {
            const userNotification = await RaidUserNotification.findOne({ where: { discordId } });
            const notificationTimes = userNotification ? userNotification.notificationTimes : [15];
            raidUserNotifications.push({ discordId, notificationTimes });
        }
    }
    for (const { discordId, notificationTimes } of raidUserNotifications) {
        for (const raid of raidsInNextDay) {
            for (const minutesBefore of notificationTimes) {
                const notifyTime = (raid.time - minutesBefore * 60) * 1000;
                if (notifyTime > Date.now()) {
                    tasks.push({ notifyTime, discordId, raidId: raid.id });
                }
            }
        }
    }
    scheduleNextNotification();
}
export async function updateNotifications(discordId, joinStatus) {
    tasks = tasks.filter((task) => task.discordId !== discordId);
    runningTimeouts.filter((t) => t.discordId === discordId).forEach((t) => clearTimeout(t.timeout));
    const notification = await RaidUserNotification.findOne({ where: { discordId } });
    const notificationTimes = notification ? notification.notificationTimes : [15];
    const raidsInNextDay = await RaidEvent.findAll({
        where: {
            time: {
                [Op.gte]: Math.floor(Date.now() / 1000),
                [Op.lt]: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000),
            },
            joined: {
                [Op.contains]: [discordId],
            },
        },
    });
    for (const raid of raidsInNextDay) {
        for (const minutesBefore of notificationTimes) {
            const notifyTime = (raid.time - minutesBefore * 60) * 1000;
            if (notifyTime > Date.now()) {
                tasks.push({ notifyTime, discordId, raidId: raid.id });
            }
        }
    }
    if (tasks.length > 0 && tasks[0].notifyTime > Date.now()) {
        scheduleNextNotification();
    }
    if (!notification && joinStatus) {
        notifyUserAboutNotifications(discordId);
    }
}
const notifiedMembers = new Set();
async function notifyUserAboutNotifications(discordId) {
    if (notifiedMembers.has(discordId))
        return;
    const embed = new EmbedBuilder()
        .setColor(colors.serious)
        .setAuthor({ name: "Похоже Вы впервые записались через систему рейдов", iconURL: icons.notify })
        .setDescription("За некоторое время до начала рейда система оповестит Вас об его приближении, рекомендуется настроить время оповещений вручную\n\n### Следуйте небольшой инструкции для настройки\n1. Нажмите кнопку ` Перейти к настройке оповещений ` под этим сообщением\n2. Изучите короткую инструкцию по настройке времени\n3. Настройте время в меню следующего сообщения");
    const components = new ButtonBuilder()
        .setCustomId(RaidButtons.notificationsStart)
        .setLabel("Перейти к настройке оповещений")
        .setStyle(ButtonStyle.Primary);
    const member = await client.getAsyncMember(discordId);
    if (!member)
        return console.error("[Error code: 1801] Member not found", discordId);
    notifiedMembers.add(discordId);
    await timer(1000 * 20);
    member.send({ embeds: [embed], components: await addButtonsToMessage([components]) });
}
export function clearNotifications(raidId) {
    tasks = tasks.filter((task) => task.raidId !== raidId);
    console.debug(`[DEBUG 6] Cleared notifications for raid ${raidId}.`);
}
export async function updateNotificationsForEntireRaid(raidId) {
    clearNotifications(raidId);
    const raid = await RaidEvent.findByPk(raidId, { attributes: ["joined"] });
    if (!raid)
        return;
    for (const userId of raid.joined) {
        await updateNotifications(userId);
    }
}
const raidInvites = new Map();
async function raidAnnounce(oldRaidData, discordId) {
    const { id: oldRaidId, time: oldRaidTime } = oldRaidData;
    const raidData = await RaidEvent.findByPk(oldRaidId, {
        attributes: ["id", "raid", "difficulty", "joined", "messageId", "creator", "time"],
    });
    if (!raidData || (raidData && raidData.time !== oldRaidTime)) {
        console.error(`[Error code: 1807] Raid ${oldRaidId} not found.`, raidData?.time, oldRaidTime, oldRaidId, discordId);
        return;
    }
    const raidInfo = getRaidData(raidData.raid, raidData.difficulty);
    const guild = client.getCachedGuild();
    const raidMembers = await Promise.all(raidData.joined.map(async (userId) => {
        return client.getAsyncMember(userId);
    }));
    const raidMembersNames = raidMembers
        .sort((a) => (a.id === raidData.creator ? 1 : 0))
        .map((member, index) => {
        const raidClears = completedRaidsData.get(member.id);
        return `⁣ ${index + 1}. **${nameCleaner(member.displayName, true)}**${raidClears
            ? ` — ${generateRaidClearsText(raidClears[raidData.raid])}${raidClears[raidData.raid + "Master"] ? ` (+**${raidClears[raidData.raid + "Master"]}** на мастере)` : ""}`
            : ""}`;
    });
    const raidTime = Math.round((raidData.time - Math.trunc(Date.now() / 1000)) / 60);
    const embed = new EmbedBuilder()
        .setColor(raidInfo ? raidInfo.raidColor : colors.default)
        .setTitle("Уведомление о скором рейде")
        .setThumbnail(raidInfo?.raidBanner ?? null)
        .setDescription(`Рейд [${raidData.id}-${raidData.raid}](https://discord.com/channels/${guildId}/${channelIds.raid}/${raidData.messageId}) начнется в течение ${raidTime} минут!\n- <t:${raidData.time}>, <t:${raidData.time}:R>`)
        .addFields({
        name: "Текущий состав группы:",
        value: raidMembersNames.join("\n") || "⁣　*никого*",
    });
    try {
        embed.setImage((await getRandomRaidGIF()) || (await getRandomGIF("raid time")));
    }
    catch (error) {
        console.error("[Error code: 1631] Error during adding image to the notify message", error);
    }
    const raidVoiceChannels = guild.channels.cache
        .filter((chn) => chn.parentId === categoryIds.raid && chn.type === ChannelType.GuildVoice && chn.name.includes("Raid"))
        .reverse();
    const components = [];
    let inviteUrl = raidInvites.get(raidData.id);
    for (const [_, chn] of raidVoiceChannels) {
        if (!inviteUrl && (chn.userLimit === 0 || chn.userLimit - 6 > chn.members.size || chn.members.has(raidData.creator))) {
            const invite = await chn.createInvite({ reason: "Raid automatic invite", maxAge: 60 * 1440 });
            inviteUrl = invite?.url;
            if (inviteUrl) {
                raidInvites.set(raidData.id, inviteUrl);
            }
            break;
        }
    }
    if (inviteUrl) {
        components.push(new ButtonBuilder({
            style: ButtonStyle.Link,
            url: inviteUrl,
            label: `Перейти в рейдовый канал`,
        }));
    }
    const member = raidMembers.find((member) => member.id === discordId);
    if (!member) {
        console.error("[Error code: 1760]", raidMembers);
        clearNotifications(raidData.id);
        return;
    }
    console.debug(`[DEBUG 12] Sending notification to ${member.displayName}.`);
    await member.send({
        embeds: [embed],
        components: await addButtonsToMessage(components),
    });
}
export async function sendNotificationInfo(interaction, deferredReply) {
    const embed = new EmbedBuilder()
        .setColor(colors.serious)
        .setTitle("Настройка оповещений об рейдах")
        .setDescription("Вы можете настроить своё время уведомлений о начале рейда, определив заранее, за сколько минут до начала рейда Вы хотите получать уведомления\n\n### Шаги для настройки\n1. Нажмите кнопку ` Настроить свои оповещения ` под этим сообщением\n2. В открывшемся меню, введите желаемое количество минут до начала рейда, когда вы хотите получать уведомления\n- Пример: `10` - установит только оповещения на 10 и 15 (стандартных) минут, а `10 | 20 | 60` установит на 10, 15, 20, 60 минут до начала рейда\n3. Затем нажмите кнопку ` Подтвердить `. Всё готово!\n\n### Дополнительные сведения\n - Вы можете указать несколько временных интервалов, разделив их любым из следующих символов: `/` `\\` `|` `,` ` `\n - Стандартное время уведомления составляет `15` минут, его нельзя ни изменить, ни удалить\n - Вы можете указывать интервалы времени от `1` минуты до `1440` минут (24 часа) до начала рейда");
    const components = new ButtonBuilder()
        .setCustomId(RaidButtons.notificationsShowModal)
        .setLabel("Настроить свои оповещения")
        .setStyle(ButtonStyle.Primary);
    if (deferredReply) {
        await deferredReply;
        await interaction.editReply({ embeds: [embed], components: await addButtonsToMessage([components]) });
    }
    else {
        await interaction.reply({ embeds: [embed], components: await addButtonsToMessage([components]), ephemeral: true });
    }
    return;
}
