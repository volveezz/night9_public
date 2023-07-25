import { ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, RESTJSONErrorCodes, } from "discord.js";
import { schedule } from "node-cron";
import { Op } from "sequelize";
import { RaidButtons } from "../../../configs/Buttons.js";
import colors from "../../../configs/colors.js";
import icons from "../../../configs/icons.js";
import { client } from "../../../index.js";
import { completedRaidsData, nonRegClanMembers, recentlyCreatedRaidInvites } from "../../persistence/dataStore.js";
import { RaidEvent, RaidUserNotification } from "../../persistence/sequelize.js";
import { addButtonsToMessage } from "../addButtonsToMessage.js";
import nameCleaner from "../nameClearer.js";
import { generateRaidCompletionText, getRaidDetails } from "../raidFunctions.js";
import { getRandomGIF, getRandomRaidGIF, timer } from "../utilities.js";
import raidFireteamChecker from "./raidFireteamChecker.js";
schedule("0 23 * * *", () => {
    recentlyCreatedRaidInvites.clear();
    nonRegClanMembers.clear();
    raidFireteamChecker();
    tasks = [];
    while (runningTimeouts.length > 0) {
        const timeout = runningTimeouts.shift();
        clearTimeout(timeout.timeout);
    }
    loadNotifications();
}, {
    timezone: "GMT",
});
let tasks = [];
let runningTimeouts = [];
async function scheduleNextNotification() {
    console.debug("Scheduling the next notification task.");
    if (tasks.length === 0) {
        console.debug("No more tasks to schedule.");
        return;
    }
    tasks.sort((a, b) => a.notifyTime - b.notifyTime);
    let nextTask = tasks.shift();
    handleNotification(nextTask);
    while (tasks[0] && nextTask.notifyTime === tasks[0].notifyTime) {
        nextTask = tasks.shift();
        handleNotification(nextTask);
    }
    async function handleNotification(task) {
        const sleepDuration = task.notifyTime - Date.now();
        console.debug("Sleep duration is", sleepDuration);
        console.debug("Tasks:", tasks.map((t) => t.notifyTime));
        if (sleepDuration > -1000) {
            console.debug("Scheduled a new notification task for", task.discordId, new Date(task.notifyTime));
            const timeout = setTimeout(async () => {
                console.debug("Sending a notification for", task.discordId, new Date(task.notifyTime));
                await sendNotification(task).catch((err) => {
                    if (err.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
                        return notifyAboutClosedDM(task.raidId, task.discordId);
                    }
                    console.error("[Error code: 1954]", err.stack || err);
                });
            }, sleepDuration);
            runningTimeouts.push({ discordId: task.discordId, timeout });
        }
        else {
            console.debug("Notification task is already expired.");
        }
    }
}
const notifiedUsersAboutClosedDM = new Set();
async function notifyAboutClosedDM(raidId, notifiedUserId) {
    if (notifiedUsersAboutClosedDM.has(notifiedUserId))
        return;
    const raidData = await RaidEvent.findOne({ where: { id: raidId }, attributes: ["channelId"] });
    if (!raidData) {
        console.error("[Error code: 1955] Exiting because raid channel wasn't found");
        return;
    }
    const raidChannel = await client.getAsyncTextChannel(raidData.channelId);
    const member = await client.getAsyncMember(notifiedUserId);
    const embed = new EmbedBuilder()
        .setColor(colors.error)
        .setAuthor({
        name: `${nameCleaner(member.displayName || member.user.username)} у Вас закрытые личные сообщения`,
        iconURL: icons.error,
    })
        .setDescription("Откройте личные сообщения, чтобы получать уведомления о рейдах");
    raidChannel.send({ content: `<@${notifiedUserId}>`, embeds: [embed] });
    notifiedUsersAboutClosedDM.add(notifiedUserId);
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
        clearNotifications(task.raidId);
        return;
    }
    if (!raid.joined.includes(task.discordId)) {
        console.debug("User", task.discordId, "has left the raid", raid.id);
        return;
    }
    console.debug("Initiating notification for", task.discordId, "for raid", raid.id);
    await announceRaidEvent(raid, task.discordId);
    console.debug("Notification is sent. Scheduling the next notification task.");
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
                    console.debug("Adding a new notification task for", discordId, notifyTime);
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
    member.send({ embeds: [embed], components: addButtonsToMessage([components]) });
}
export function clearNotifications(raidId) {
    console.debug("Clearing notifications for raid", raidId);
    tasks = tasks.filter((task) => task.raidId !== raidId);
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
async function announceRaidEvent(previousRaidEvent, discordUserId) {
    const { id: previousRaidId, time: previousRaidTime } = previousRaidEvent;
    const currentRaidEvent = await RaidEvent.findByPk(previousRaidId, {
        attributes: ["id", "raid", "difficulty", "joined", "messageId", "creator", "time"],
    });
    if (!currentRaidEvent || (currentRaidEvent && currentRaidEvent.time !== previousRaidTime)) {
        console.error(`[Error code: 1807] Raid ${previousRaidId} not found.`, currentRaidEvent?.time, previousRaidTime, previousRaidId, discordUserId);
        return;
    }
    const raidDetails = getRaidDetails(currentRaidEvent.raid, currentRaidEvent.difficulty);
    const guild = client.getCachedGuild();
    const raidParticipants = await Promise.all(currentRaidEvent.joined.map(async (userId) => {
        return client.getAsyncMember(userId);
    }));
    const participantNames = raidParticipants
        .sort((participant) => (participant.id === currentRaidEvent.creator ? 1 : 0))
        .map((participant, index) => {
        const raidCompletionData = completedRaidsData.get(participant.id);
        return `⁣ ${index + 1}. **${nameCleaner(participant.displayName, true)}**${raidCompletionData
            ? ` — ${generateRaidCompletionText(raidCompletionData[currentRaidEvent.raid])}${raidCompletionData[currentRaidEvent.raid + "Master"]
                ? ` (+**${raidCompletionData[currentRaidEvent.raid + "Master"]}** на мастере)`
                : ""}`
            : ""}`;
    });
    const timeUntilRaid = Math.round((currentRaidEvent.time - Math.trunc(Date.now() / 1000)) / 60);
    const raidEmbed = new EmbedBuilder()
        .setColor(raidDetails ? raidDetails.raidColor : colors.default)
        .setTitle("Уведомление о скором рейде")
        .setThumbnail(raidDetails?.raidBanner || null)
        .setDescription(`Рейд [${currentRaidEvent.id}-${currentRaidEvent.raid}](https://discord.com/channels/${process.env.GUILD_ID}/${process.env
        .RAID_CHANNEL_ID}/${currentRaidEvent.messageId}) начнется в течение ${timeUntilRaid} минут!\nВ: <t:${currentRaidEvent.time}>, <t:${currentRaidEvent.time}:R>`)
        .addFields({
        name: "Текущий состав группы:",
        value: participantNames.join("\n") || "⁣　*никого*",
    });
    try {
        raidEmbed.setImage((await getRandomRaidGIF()) || (await getRandomGIF("raid time")));
    }
    catch (error) {
        console.error("[Error code: 1631] Error during adding image to the notification message", error);
    }
    const raidVoiceChannels = guild.channels.cache
        .filter((channel) => channel.parentId === process.env.RAID_CATEGORY && channel.type === ChannelType.GuildVoice && channel.name.includes("Raid"))
        .reverse();
    const buttonComponents = [];
    const raidInviteUrl = await createRaidVoiceInvite(raidVoiceChannels, currentRaidEvent.creator, currentRaidEvent.id);
    if (raidInviteUrl) {
        buttonComponents.push(new ButtonBuilder({
            style: ButtonStyle.Link,
            url: raidInviteUrl,
            label: "Перейти в рейдовый канал",
        }));
    }
    const discordUser = raidParticipants.find((participant) => participant.id === discordUserId);
    if (!discordUser) {
        console.error("[Error code: 1760]", raidParticipants);
        clearNotifications(currentRaidEvent.id);
        return;
    }
    console.debug(`[DEBUG] Sending notification to ${discordUser.displayName}.`);
    await discordUser.send({
        embeds: [raidEmbed],
        components: addButtonsToMessage(buttonComponents),
    });
}
async function createRaidVoiceInvite(channels, creatorId, raidId) {
    const raidInviteUrl = recentlyCreatedRaidInvites.get(raidId);
    if (!raidInviteUrl) {
        let raidInviteChannel;
        raidInviteChannel = channels.find((channel) => channel.members.has(creatorId));
        if (!raidInviteChannel) {
            raidInviteChannel = channels.find((channel) => channel.userLimit === 0 || channel.userLimit - 6 > channel.members.size);
        }
        if (raidInviteChannel) {
            if (recentlyCreatedRaidInvites.has(raidId)) {
                console.debug("Managed to get an invite url, returning it");
                return recentlyCreatedRaidInvites.get(raidId);
            }
            console.debug(`[DEBUG] Creating invite for ${raidInviteChannel.name}`);
            const newRaidInvite = (await raidInviteChannel.createInvite({ reason: "Raid automatic invite", maxAge: 60 * 1440 })).url;
            recentlyCreatedRaidInvites.set(raidId, newRaidInvite);
            return newRaidInvite;
        }
    }
    return raidInviteUrl;
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
        await interaction.editReply({ embeds: [embed], components: addButtonsToMessage([components]) });
    }
    else {
        await interaction.reply({ embeds: [embed], components: addButtonsToMessage([components]), ephemeral: true });
    }
    return;
}
//# sourceMappingURL=raidNotifications.js.map