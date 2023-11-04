import { ButtonBuilder, ButtonStyle, EmbedBuilder, } from "discord.js";
import colors from "../../configs/colors.js";
import icons, { activityIcons } from "../../configs/icons.js";
import { client } from "../../index.js";
import checkIfUserRecentlyCreatedActivity from "../../utils/discord/checkRecentlyCreatedActivity.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import nameCleaner from "../../utils/general/nameClearer.js";
import { generateRaidCompletionText, getRaidDetails } from "../../utils/general/raidFunctions.js";
import sendRaidPrivateMessage from "../../utils/general/raidFunctions/privateMessage/sendPrivateMessage.js";
import raidFireteamCheckerSystem from "../../utils/general/raidFunctions/raidFireteamChecker/raidFireteamChecker.js";
import { updateNotifications } from "../../utils/general/raidFunctions/raidNotifications.js";
import { descriptionFormatter } from "../../utils/general/utilities.js";
import { completedRaidsData } from "../../utils/persistence/dataStore.js";
import { sequelizeInstance } from "../../utils/persistence/sequelize.js";
import { RaidEvent } from "../../utils/persistence/sequelizeModels/raidEvent.js";
export async function createRaid({ interaction, difficulty, raid, member, time, clearRequirement, description, deferredReply, }) {
    const raidData = getRaidDetails(raid, difficulty);
    const guild = member.guild;
    let transaction;
    try {
        transaction = await sequelizeInstance.transaction();
        const raidClears = completedRaidsData.get(interaction.user.id);
        const mainComponents = [
            new ButtonBuilder().setCustomId("raidButton_action_join").setLabel("Записаться").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("raidButton_action_leave").setLabel("Выйти").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("raidButton_action_alt").setLabel("Возможно буду").setStyle(ButtonStyle.Secondary),
        ];
        const isUserCreatedRaidRecently = checkIfUserRecentlyCreatedActivity(interaction.user.id);
        const roleMention = !isUserCreatedRaidRecently
            ? raidData.requiredRole !== null
                ? `<@&${raidData.requiredRole}>`
                : member.guild.roles.everyone
            : "";
        const content = `Открыт набор в рейд: ${raidData.raidName} ${roleMention}`;
        const raidChannelPromise = client.getTextChannel(process.env.RAID_CHANNEL_ID);
        const additionalPosition = guild.channels.cache.get(process.env.RAID_CATEGORY)?.children?.cache.size || 1;
        const raidEventPromise = RaidEvent.create({
            channelId: member.id,
            inChannelMessageId: member.id,
            messageId: member.id,
            creator: member.id,
            joined: [member.id],
            time,
            raid: raidData.raid,
            difficulty,
            requiredClears: clearRequirement,
        }, { transaction }).catch((e) => console.error("[Error code: 2121]", e));
        const [raidEvent, raidChannel] = await Promise.all([raidEventPromise, raidChannelPromise]);
        if (!raidEvent || !raidChannel) {
            console.error("[Error code: 2120]", raidEvent == null ? "raidEvent" : "raidChannel");
            throw { name: "Произошла ошибка во время создания рейда" };
        }
        const privateRaidChannel = await member.guild.channels.create({
            name: `🔥｜${raidEvent.id}-${raidData.channelName}`,
            parent: process.env.RAID_CATEGORY,
            position: raidChannel.rawPosition + additionalPosition,
            permissionOverwrites: [
                {
                    deny: "ViewChannel",
                    id: guild.roles.everyone,
                },
                {
                    allow: ["ViewChannel", "ManageMessages", "MentionEveryone"],
                    id: member.id,
                },
            ],
            reason: `${nameCleaner(member.displayName)} created new raid`,
        });
        raidEvent.channelId = privateRaidChannel.id;
        const inChannelMessagePromise = sendRaidPrivateMessage({ channel: privateRaidChannel, raidEvent, transaction });
        const raidClearsText = raidClears
            ? ` — ${generateRaidCompletionText(raidClears[raidData.raid])}${raidClears[raidData.raid + "Master"] ? ` (+**${raidClears[raidData.raid + "Master"]}** на мастере)` : ""}`
            : "";
        const embed = new EmbedBuilder()
            .setTitle(`Рейд: ${raidData.raidName}${clearRequirement >= 1 ? ` от ${clearRequirement} закрыт${clearRequirement === 1 ? "ия" : "ий"}` : ""}`)
            .setColor(raidData.raidColor)
            .setFooter({
            text: `Создатель рейда: ${nameCleaner(member.displayName)}`,
            iconURL: activityIcons.raid,
        })
            .setThumbnail(raidData.raidBanner)
            .addFields([
            {
                name: "Id",
                value: `[${raidEvent.id}](https://discord.com/channels/${interaction.guildId}/${privateRaidChannel.id})`,
                inline: true,
            },
            {
                name: `Начало: <t:${time}:R>`,
                value: `<t:${time}>`,
                inline: true,
            },
            {
                name: "Участник: 1/6",
                value: `⁣　1. **${nameCleaner(member.displayName, true)}**${raidClearsText}`,
            },
        ]);
        if (description && description.length < 1024) {
            embed.spliceFields(2, 0, {
                name: "Описание",
                value: descriptionFormatter(description),
            });
        }
        const messagePromise = raidChannel.send({
            content,
            embeds: [embed],
            components: addButtonsToMessage(mainComponents),
        });
        const [message, inChannelMessage] = await Promise.all([messagePromise, inChannelMessagePromise]);
        raidEvent.messageId = message.id;
        raidEvent.inChannelMessageId = inChannelMessage.id;
        await raidEvent.save({ transaction });
        await transaction.commit();
        deferredReply.then(async (_) => {
            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setAuthor({ name: "Рейд создан", iconURL: icons.success })
                .setDescription(`Канал рейда: <#${privateRaidChannel.id}>, [ссылка на сообщение набора](https://discord.com/channels/${guild.id}/${process
                .env.RAID_CHANNEL_ID}/${message.id})`);
            interaction.editReply({ embeds: [embed] });
        });
        if (time <= Math.floor(Date.now() / 1000 + 24 * 60 * 60 * 2)) {
            updateNotifications(interaction.user.id);
        }
        raidFireteamCheckerSystem(raidEvent.id);
    }
    catch (error) {
        await transaction?.rollback();
        console.error(`[Error code: 2045]`, error);
    }
}
//# sourceMappingURL=createRaid.js.map