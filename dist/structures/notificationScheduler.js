import { ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder } from "discord.js";
import pkg from "lodash";
import { Op } from "sequelize";
import colors from "../configs/colors.js";
import { activityIcons } from "../configs/icons.js";
import { client } from "../index.js";
import { GetManifest } from "../utils/api/ManifestManager.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import { getRaidDetails } from "../utils/general/raidFunctions.js";
import { createActivityVoiceInvite } from "../utils/general/raidFunctions/createRaidVoiceInvite.js";
import { askRaidReadinessNotification } from "../utils/general/raidFunctions/raidReadiness/askUserRaidReadiness.js";
import { getRandomRaidGIF } from "../utils/general/utilities.js";
import { RaidUserNotifications } from "../utils/persistence/sequelizeModels/raidUserNotifications.js";
import { LFGController } from "./LFGController.js";
const { debounce } = pkg;
class NotificationScheduler {
    timer;
    lfgCache;
    raidCache;
    rescheduleNotificationDebounced;
    constructor() {
        this.rescheduleNotificationDebounced = debounce(this.rescheduleNotifications, 3000);
    }
    updateCache(params) {
        if (params.lfgCache)
            this.lfgCache = params.lfgCache;
        if (params.raidCache)
            this.raidCache = params.raidCache;
        this.rescheduleNotificationDebounced();
        console.debug("[NotificationScheduler] Cache updated");
    }
    async rescheduleNotifications() {
        console.debug("[NotificationScheduler] Rescheduling notifications");
        if (this.timer)
            clearTimeout(this.timer);
        const mergedNotifications = [...this.collectNotifications("lfg"), ...this.collectNotifications("raid")];
        const validNotifications = mergedNotifications.filter((n) => n.time * 1000 > Date.now());
        if (!validNotifications.length)
            return;
        validNotifications.sort((a, b) => a.time - b.time);
        const uniqueNotificationTimes = [...new Set(validNotifications.map((n) => n.time))];
        for (const notificationTime of uniqueNotificationTimes) {
            const notificationsAtThisTime = validNotifications.filter((n) => n.time === notificationTime);
            console.debug("[NotificationScheduler] Notifications at", new Date(notificationTime * 1000), notificationsAtThisTime);
            const usersToNotify = notificationsAtThisTime.flatMap((n) => n.users);
            console.debug("[NotificationScheduler] Users to Notify", usersToNotify);
            const userPreferences = await this.getUsersNotificationPreferences(usersToNotify);
            for (const notification of notificationsAtThisTime) {
                const minTimeDifference = this.calculateMinTimeDifference(userPreferences, notification);
                console.debug("[NotificationScheduler] Min Time Difference for Notification", minTimeDifference);
                if (!isFinite(minTimeDifference) || minTimeDifference <= 0)
                    continue;
                this.timer = setTimeout(() => {
                    this.processNotification(notification);
                    console.debug("[NotificationScheduler] Processed Notification", notification);
                    this.rescheduleNotificationDebounced();
                }, minTimeDifference * 1000);
                console.debug("[NotificationScheduler] Rescheduled Notification", new Date(Date.now() + minTimeDifference * 1000));
            }
        }
    }
    collectNotifications(type) {
        const cache = type === "lfg" ? this.lfgCache : this.raidCache;
        if (!cache)
            return [];
        return Object.entries(cache).map(([id, detail]) => {
            const numericId = Number(id);
            if (type === "lfg") {
                return {
                    users: detail.joinedUsers,
                    time: detail.time,
                    lfgId: numericId,
                };
            }
            else {
                return {
                    users: detail.joinedUsers,
                    time: detail.time,
                    raidId: numericId,
                };
            }
        });
    }
    async getUsersNotificationPreferences(userIds) {
        const userPreferences = await RaidUserNotifications.findAll({
            where: { discordId: { [Op.in]: userIds } },
        });
        return userPreferences.reduce((prefs, { discordId, notificationTimes }) => {
            prefs[discordId] = [...(prefs[discordId] || []), ...notificationTimes];
            return prefs;
        }, {});
    }
    calculateMinTimeDifference(userPreferences, notification) {
        return notification.users.reduce((minDiff, userId) => {
            const times = userPreferences[userId] || [15, 60];
            return times.reduce((minTime, time) => {
                const currentTimestamp = Date.now() / 1000;
                const timeDiff = notification.time - time * 60 - currentTimestamp;
                return timeDiff > 0 ? Math.min(minTime, timeDiff) : minTime;
            }, minDiff);
        }, Infinity);
    }
    async processNotification(notification) {
        const cache = notification.lfgId ? this.lfgCache?.[notification.lfgId] : this.raidCache?.[notification.raidId];
        if (!cache)
            return;
        if (notification.raidId) {
            let timeDifference = Math.floor(Date.now() / 1000) - cache.time;
            if (Math.abs(timeDifference - 3600) <= 59) {
                for (let i = 0; i < notification.users.length; i++) {
                    await askRaidReadinessNotification(notification.users[i], notification.raidId);
                }
                return;
            }
        }
        const randomGif = await getRandomRaidGIF().catch((_) => "https://media.giphy.com/media/cKJZAROeOx7MfU6Kws/giphy.gif");
        const embed = new EmbedBuilder()
            .setImage(randomGif)
            .addFields({ name: "Id", value: (notification.raidId || notification.lfgId).toString(), inline: true }, { name: `Начало <t:${cache.time}:R>`, value: `<t:${cache.time}>`, inline: true });
        const inviteButtons = [];
        const voiceChannels = (await client.getGuild()).channels.cache.filter((channel) => channel.type === ChannelType.GuildVoice &&
            channel.parentId === (notification.lfgId ? process.env.PVE_PARTY_CATEGORY : process.env.RAID_CATEGORY));
        const creatorInvite = cache &&
            (await createActivityVoiceInvite({
                channels: voiceChannels,
                joinedUsers: notification.users,
                creatorId: cache.creatorId,
            }));
        const membersInvite = await createActivityVoiceInvite({
            channels: voiceChannels,
            joinedUsers: notification.users,
        });
        if (creatorInvite) {
            inviteButtons.push(new ButtonBuilder().setLabel("Перейти к создателю активности").setStyle(ButtonStyle.Link).setURL(creatorInvite));
        }
        if (membersInvite && creatorInvite !== membersInvite) {
            inviteButtons.push(new ButtonBuilder().setLabel("Перейти в голосовой канал").setStyle(ButtonStyle.Link).setURL(membersInvite));
        }
        function isLFGDetails(obj) {
            return "activityHash" in obj;
        }
        function isRaidCache(obj) {
            return "raid" in obj;
        }
        if (notification.lfgId && isLFGDetails(cache)) {
            const manifest = await GetManifest("DestinyActivityDefinition");
            const activity = manifest[Number(cache.activityHash)];
            if (cache.activityHash && manifest) {
                const activityPGCRImage = activity.pgcrImage;
                if (activityPGCRImage && activityPGCRImage !== "/img/theme/destiny/bgs/pgcrs/placeholder.jpg") {
                    embed.setThumbnail(`https://www.bungie.net${activityPGCRImage}`);
                }
                const activityName = activity.displayProperties.name;
                if (activityName.length > 2 && activity.displayProperties.name !== "Засекречено") {
                    embed.setTitle(activity.displayProperties.name);
                }
            }
            const url = `https://discord.com/channels/${cache.guild?.id || process.env.GUILD_ID}/${cache.channel?.id || process.env.PVE_PARTY_CHANNEL_ID}/${cache.message?.id ? cache.message.id : ""}`;
            embed
                .setColor(colors.deepBlue)
                .setAuthor({ name: "Оповещение о скором сборе", url })
                .setDescription("Страж, сбор, на который вы записаны, скоро начнётся")
                .addFields(LFGController.getInstance().generateLfgJoinedField(cache));
        }
        else if (notification.raidId && isRaidCache(cache)) {
            const raidActivity = getRaidDetails(cache.raid, cache.difficulty);
            embed
                .setColor(colors.deepBlue)
                .setAuthor({ name: "Оповещение о скором рейде", iconURL: activityIcons.raid })
                .setTitle(raidActivity.raidName)
                .setThumbnail(raidActivity.raidBanner)
                .setURL(`https://discord.com/channels/${cache.guild?.id || process.env.GUILD_ID}/${cache.channel?.id || process.env.RAID_CHANNEL_ID}${cache.message?.id ? `/${cache.message.id}` : ""}}`)
                .addFields();
        }
        else {
            return;
        }
        for (let i = 0; i < notification.users.length; i++) {
            const userId = notification.users[i];
            const user = await client.getMember(userId).catch((e) => null);
            if (!user) {
                console.error("[Error code: 2069] Failed to find user", userId);
                continue;
            }
            await user
                .send({ embeds: [embed], components: addButtonsToMessage(inviteButtons) })
                .catch((e) => console.error("[Error code: 2070] Failed to send notification", e));
        }
        console.debug("[NotificationScheduler] Processing notification", notification);
    }
}
const notificationScheduler = new NotificationScheduler();
export default notificationScheduler;
//# sourceMappingURL=notificationScheduler.js.map