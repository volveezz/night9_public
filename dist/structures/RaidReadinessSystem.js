import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import sanitizeName from "../utils/general/nameClearer.js";
import fetchRaidDetails from "../utils/general/raidFunctions/getRaidEventData.js";
class RaidReadiness {
    raidDetailsMap = new Map();
    constructor() { }
    async initializeRaid(raidId) {
        const raidDetails = await fetchRaidDetails(raidId);
        if (!raidDetails || raidDetails.time * 1000 <= Date.now())
            return;
        const raidChannel = client.getCachedTextChannel(raidDetails.channelId) || (await client.getTextChannel(raidDetails.channelId));
        this.raidDetailsMap.set(raidId, {
            channel: raidChannel,
            message: null,
            readyMembers: new Set(),
            lateMembers: new Set(),
            notReadyMembers: new Set(),
            unmarkedMembers: new Set(raidDetails.joined),
            lateReasons: new Map(),
        });
    }
    async fetchSystemMessage(raidId) {
        let raidDetails = this.raidDetailsMap.get(raidId);
        if (!raidDetails)
            await this.initializeRaid(raidId);
        raidDetails = this.raidDetailsMap.get(raidId);
        if (!raidDetails) {
            console.error("[Error code: 1990] Failed to structure raid data", raidId);
            return null;
        }
        if (!raidDetails.channel) {
            await this.initializeRaid(raidId);
            if (!raidDetails.channel) {
                throw new Error("Произошла ошибка во время сохранения данных о рейде");
            }
        }
        const existingMessage = raidDetails.message && (await raidDetails.channel.messages.fetch(raidDetails.message).catch(() => null));
        if (existingMessage)
            return existingMessage;
        const embed = new EmbedBuilder().setColor(colors.default).setTitle("Система готовности к рейду");
        const newMessage = await raidDetails.channel.send({ embeds: [embed] });
        raidDetails.message = newMessage;
        return newMessage;
    }
    async updateReadinessMessage(raidId) {
        const message = await this.fetchSystemMessage(raidId);
        if (!message)
            return;
        const embed = EmbedBuilder.from(message.embeds[0]);
        const currentRaidDetails = this.raidDetailsMap.get(raidId);
        if (!currentRaidDetails) {
            message.delete();
            this.raidDetailsMap.delete(raidId);
            return;
        }
        const updateStatusList = async (statusSet, targetList, emoji, isLateUsers = false) => {
            Array.from(statusSet).forEach(async (userId) => {
                const memberName = client.getCachedMembers().get(userId)?.displayName || (await client.getMember(userId)).displayName;
                targetList.push(`⁣　${emoji} ${sanitizeName(memberName, true)}${isLateUsers && currentRaidDetails.lateReasons.has(userId) ? `: ${currentRaidDetails.lateReasons.get(userId)}` : ""}`);
            });
        };
        const readyList = [];
        const lateList = [];
        const notReadyList = [];
        const unmarkedList = [];
        await Promise.all([
            updateStatusList(currentRaidDetails.readyMembers, readyList, "<:verified:1138549280550965308>"),
            updateStatusList(currentRaidDetails.lateMembers, lateList, "<:warning:1138257725835444374>", true),
            updateStatusList(currentRaidDetails.notReadyMembers, notReadyList, "<:crossmark:1020504750350934026>"),
            updateStatusList(currentRaidDetails.unmarkedMembers, unmarkedList, "<:question:1138549285219225600>"),
        ]);
        embed.data.fields = [];
        if (readyList.length)
            embed.addFields({ name: "Готовы к рейду", value: readyList.join("\n") });
        if (lateList.length)
            embed.addFields({ name: "Опоздают", value: lateList.join("\n") });
        if (notReadyList.length || unmarkedList.length)
            embed.addFields({ name: "Не готовы", value: [...notReadyList, ...unmarkedList].join("\n") });
        message.edit({ embeds: [embed] });
    }
    async setUserReadinessStatus({ button, discordId, raidId }) {
        let currentRaidDetails = this.raidDetailsMap.get(raidId);
        if (!currentRaidDetails)
            await this.fetchSystemMessage(raidId);
        currentRaidDetails = this.raidDetailsMap.get(raidId);
        if (!currentRaidDetails) {
            console.error("[Error code: 1988] Raid Readiness System Error", raidId, button, discordId);
            throw new Error("Ошибка системы готовности к рейду");
        }
        currentRaidDetails.unmarkedMembers.delete(discordId);
        currentRaidDetails.notReadyMembers.delete(discordId);
        currentRaidDetails.readyMembers.delete(discordId);
        currentRaidDetails.lateMembers.delete(discordId);
        switch (button) {
            case "raidReadiness_ready":
                currentRaidDetails.readyMembers.add(discordId);
                break;
            case "raidReadiness_wontBeReady":
                currentRaidDetails.notReadyMembers.add(discordId);
                break;
            case "raidReadiness_willBeReady":
                currentRaidDetails.lateMembers.add(discordId);
                break;
        }
        await this.updateReadinessMessage(raidId);
    }
    async setUserReadinessLateReason({ discordId, raidId, reason }) {
        let currentRaidDetails = this.raidDetailsMap.get(raidId);
        if (!currentRaidDetails)
            await this.fetchSystemMessage(raidId);
        currentRaidDetails = this.raidDetailsMap.get(raidId);
        if (!currentRaidDetails) {
            console.error("[Error code: 1988] Raid Readiness System Error", raidId, discordId, reason);
            throw new Error("Ошибка системы готовности к рейду");
        }
        currentRaidDetails.lateReasons.set(discordId, reason);
        await this.updateReadinessMessage(raidId);
        return true;
    }
}
const readinessInstance = new RaidReadiness();
export default readinessInstance;
//# sourceMappingURL=RaidReadinessSystem.js.map