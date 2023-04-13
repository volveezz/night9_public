import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { handleDeleteRaid } from "../../../buttons/raidInChnButton.js";
import { RaidButtons } from "../../../configs/Buttons.js";
import colors from "../../../configs/colors.js";
import icons from "../../../configs/icons.js";
import { guildId, ids } from "../../../configs/ids.js";
import { statusRoles } from "../../../configs/roles.js";
import { client } from "../../../index.js";
import { RaidEvent } from "../../persistence/sequelize.js";
import { addButtonComponentsToMessage } from "../addButtonsToMessage.js";
import { completedRaidsData } from "../destinyActivityChecker.js";
import nameCleaner from "../nameClearer.js";
import { removeRaid } from "../raidFunctions.js";
export const leavingCreatorCollector = new Map();
export async function handleRaidCreatorLeaving(raid, creatorId) {
    const creator = client.users.cache.get(creatorId) ||
        (await client.users.fetch(creatorId)) ||
        (await client.getCachedGuild().members.fetch(creatorId)).user;
    if (!creator) {
        console.error("[Error code: 1674] Creator not found");
        return;
    }
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Вы покинули рейд ${raid.id}-${raid.raid} являясь его создателем`, iconURL: icons.error })
        .setDescription(`Права на рейд будут переданы другому участнику в течение 10 минут\n\nПри желании вы можете выполнить одно из трех действий:\n　1. Отменить передачу прав, если вы знаете, что делаете\n　2. Удалить рейд\n　3. Передать права другому участнику вручную`)
        .setColor(colors.error);
    const cancelButton = new ButtonBuilder()
        .setLabel("Отменить передачу прав")
        .setStyle(ButtonStyle.Primary)
        .setCustomId(RaidButtons.transitionCancel);
    const deleteButton = new ButtonBuilder().setLabel("Удалить рейд").setStyle(ButtonStyle.Danger).setCustomId(RaidButtons.transitionDelete);
    const buttons = await addButtonComponentsToMessage([cancelButton, deleteButton]);
    const message = await creator.send({ embeds: [embed], components: buttons });
    const collector = (creator.dmChannel || (await creator.createDM())).createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === creator.id,
        time: 1000 * 60 * 10,
        message,
    });
    const sendedButtons = new Set();
    collector.on("collect", async (button) => {
        const deferredUpdate = button.deferReply({ ephemeral: true });
        sendedButtons.add(button);
        if (button.customId === RaidButtons.transitionCancel) {
            return collector.stop("canceled");
        }
        if (button.customId === RaidButtons.transitionDelete) {
            const isRaidDeleted = await handleDeleteRaid({ interaction: button, raidEvent: raid, deferredUpdate, requireMessageReply: false });
            if (isRaidDeleted === 1) {
                sendedButtons.delete(button);
                return collector.stop("deleted");
            }
            else if (isRaidDeleted === 2) {
                sendedButtons.delete(button);
                setTimeout(() => button.deleteReply(), 1500);
            }
            else if (isRaidDeleted === 3) {
                button.deleteReply();
                sendedButtons.delete(button);
            }
            else {
                if ((await button.message.fetch()).embeds[0].author?.name === embed.data.author?.name) {
                    return collector.stop("deleteError");
                }
                else {
                    return collector.stop("deleted");
                }
            }
        }
    });
    collector.on("end", async (_, reason) => {
        sendedButtons.forEach((i) => i.deleteReply().catch((e) => {
            return console.error(`[Error code: 1679]`, e);
        }));
        sendedButtons.clear();
        const handleEndReason = () => {
            if (reason === "canceled") {
                return new EmbedBuilder().setColor(colors.invisible).setTitle(`Вы отменили передачу прав рейда ${raid.id}-${raid.raid}`);
            }
            if (reason === "deleted") {
                return new EmbedBuilder().setColor(colors.invisible).setTitle(`Вы удалили рейд ${raid.id}-${raid.raid}`);
            }
            if (reason === "deleteError") {
                return new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle(`Произошла ошибка во время удаления ${raid.id}-${raid.raid}`)
                    .setDescription(`Скорее всего, рейд уже был удален`);
            }
        };
        if (reason === "time") {
            const updatedRaidData = await RaidEvent.findByPk(raid.id);
            if (!updatedRaidData ||
                updatedRaidData.creator !== raid.creator ||
                ![...updatedRaidData.joined, ...updatedRaidData.hotJoined, ...updatedRaidData.alt].includes(raid.creator)) {
                if (updatedRaidData && updatedRaidData.creator !== raid.creator) {
                    const embed = new EmbedBuilder()
                        .setColor(colors.serious)
                        .setTitle(`Вы передали права создателя рейда ${updatedRaidData.id}-${updatedRaidData.raid}`);
                    await message.edit({ embeds: [embed], components: [] });
                    return;
                }
                else if (!updatedRaidData) {
                    const embed = new EmbedBuilder().setColor(colors.serious).setTitle(`Рейд ${raid.id}-${raid.raid} был удален`);
                    await message.edit({ embeds: [embed], components: [] });
                    return;
                }
                await message.delete().catch((e) => {
                    return console.error(`[Error code: 1680]`, e);
                });
                return;
            }
            const newRaidCreator = await findNewRaidCreator(raid);
            const timeEndEmbed = new EmbedBuilder().setColor(colors.serious);
            if (newRaidCreator != null) {
                timeEndEmbed.setAuthor({ name: `Время вышло. Права на рейд ${raid.id}-${raid.raid} были переданы`, iconURL: icons.notify });
            }
            else {
                timeEndEmbed.setAuthor({ name: `Время вышло. Рейд ${raid.id}-${raid.raid} был удален` });
            }
            await message.edit({ embeds: [timeEndEmbed], components: [] });
            if (!newRaidCreator) {
                await removeRaid(raid).catch((e) => {
                    console.error(`[Error code: 1677]`, e);
                });
                return;
            }
            return await raidCreatorTransition(newRaidCreator, raid);
        }
        else {
            const embed = handleEndReason() || new EmbedBuilder().setColor(colors.error).setAuthor({ name: `Произошла ошибка`, iconURL: icons.error });
            await message.edit({ embeds: [embed], components: [] });
            return;
        }
    });
}
async function raidCreatorTransition(member, raid) {
    const raidMessage = await (client.getCachedTextChannel(ids.raidChnId) || (await client.getCachedGuild().channels.fetch(ids.raidChnId))).messages.fetch(raid.messageId);
    const raidEmbed = EmbedBuilder.from(raidMessage.embeds[0]);
    raidEmbed.setFooter({ text: `Создатель рейда: ${nameCleaner(member.displayName)}` });
    await raidMessage.edit({ embeds: [raidEmbed] });
    const [updateQuery] = await RaidEvent.update({ creator: member.id }, { where: { id: raid.id } });
    if (updateQuery !== 1)
        return console.error(`[Error code: 1675] ${updateQuery}\n`, member, raid);
    const sendPrivateChannelNotify = async () => {
        const privateRaidChannel = client.getCachedTextChannel(raid.channelId) || (await client.getCachedGuild().channels.fetch(raid.channelId));
        const notifyEmbed = new EmbedBuilder()
            .setColor(colors.default)
            .addFields([{ name: "Создатель рейда", value: `Права создателя были переданы ${nameCleaner(member.displayName, true)}` }])
            .setFooter({ text: `Изменение системой` });
        await privateRaidChannel.send({ embeds: [notifyEmbed] });
    };
    const notifyNewCreator = async () => {
        const embed = new EmbedBuilder()
            .setColor(colors.default)
            .setAuthor({
            name: `Вам были переданы права на рейд ${raid.id}-${raid.raid}`,
            url: `https://discord.com/channels/${guildId}/${ids.raidChnId}/${raid.messageId}`,
        })
            .setDescription(`Вы получили эти права поскольку предыдущий создатель покинул рейд\n\nСоздатель рейда - участник, который имеет повышенные права в рейде\nСоздатель рейда может:\n　- Изменять рейд, в который идет набор\n　- Изменять время, требования по закрытым рейдам для записи, описание набора`)
            .addFields([
            {
                name: `Передача прав на рейд другому участнику`,
                value: `⁣　\`/рейд изменить новый_создатель:\`\n　\`/raid edit new_creator:\``,
            },
            {
                name: `Изменение времени набора`,
                value: `⁣　\`/рейд изменить новое_время:ВРЕМЯ_В_ФОРМАТЕ\`\n　\`/raid edit new_time:ВРЕМЯ_В_ФОРМАТЕ\`\nВместо \`ВРЕМЯ_В_ФОРМАТЕ\` - необходимо указать время в следующем формате: \`ЧАС:МИНУТЫ ДЕНЬ/МЕСЯЦ\` (т.е. время разделяется двоеточием \`:\`, а дата точкой или слешем \`/\`)`,
            },
        ]);
        await member.send({ embeds: [embed] });
    };
    await Promise.all([sendPrivateChannelNotify(), notifyNewCreator()]);
    return;
}
function isClanMember(member) {
    return member.roles.cache.has(statusRoles.clanmember);
}
async function findNewRaidCreator(raid) {
    let newCreator = null;
    let highestClears = -1;
    const guild = client.getCachedGuild();
    const joinedUsersId = [...raid.joined, ...raid.hotJoined];
    const altUsersId = raid.alt;
    async function findCreatorForMemberList(memberIds, searchOffline, skipRequirements = false) {
        for (const userId of memberIds) {
            const member = client.getCachedMembers().get(userId) || (await guild.members.fetch(userId));
            const presence = member.presence;
            if (!skipRequirements && (!presence || (!searchOffline && presence.status === "offline")))
                continue;
            if (!skipRequirements && !isClanMember(member))
                continue;
            const memberClearsData = completedRaidsData.get(member.id);
            if (!skipRequirements && !memberClearsData)
                continue;
            const memberTotalClears = memberClearsData?.[`${raid.raid}`] || 0 + memberClearsData?.[`${raid.raid}Master`] || 0;
            if (memberTotalClears > highestClears) {
                highestClears = memberTotalClears;
                newCreator = member;
            }
        }
    }
    await findCreatorForMemberList(joinedUsersId, false);
    if (!newCreator) {
        await findCreatorForMemberList(joinedUsersId, true);
    }
    if (!newCreator) {
        await findCreatorForMemberList(altUsersId, true);
    }
    if (!newCreator) {
        await findCreatorForMemberList([...joinedUsersId, ...altUsersId], true, true);
    }
    return newCreator;
}