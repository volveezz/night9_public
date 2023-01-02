import { ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, } from "discord.js";
import { Op } from "sequelize";
import colors from "../configs/colors.js";
import { ids, ownerId } from "../configs/ids.js";
import UserErrors from "../enums/UserErrors.js";
import { AuthData, RaidEvent } from "../handlers/sequelize.js";
import { RaidAdditionalFunctional, RaidButtons } from "../enums/Buttons.js";
import { activityCompletionChecker, activityCompletionCheckerCancel } from "../functions/activityCompletionChecker.js";
import { fetchRequest } from "../functions/fetchRequest.js";
export default {
    name: "raidInChnButton",
    run: async ({ client, interaction }) => {
        const attributes = ["creator", "id", "raid", "joined", "messageId", "channelId"];
        const raidDataQuery = interaction.channel?.isDMBased()
            ? RaidEvent.findOne({
                where: {
                    [Op.and]: [
                        { id: parseInt(interaction.message.embeds[0].data.footer?.text.split("RId: ").pop()) },
                        { creator: interaction.user.id },
                    ],
                },
                attributes,
            })
            : RaidEvent.findOne({ where: { inChannelMessageId: interaction.message.id }, attributes });
        const deferredReply = interaction.deferUpdate();
        const member = client.getCachedMembers().get(interaction.user.id);
        const guild = interaction.guild || client.getCachedGuild();
        if (!member)
            throw {
                name: "Вы не участник сервера",
                description: "Пожалуйста, объясните администрации как вы получили эту ошибку",
            };
        if (!guild)
            throw { name: "Ошибка. Сервер недоступен" };
        const raidData = await raidDataQuery;
        if (!raidData) {
            if (interaction.channel?.isDMBased())
                interaction.message.edit({ components: [] });
            throw { errorType: UserErrors.RAID_NOT_FOUND };
        }
        if (raidData.creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator"))
            throw { errorType: UserErrors.RAID_MISSING_PERMISSIONS };
        switch (interaction.customId) {
            case RaidButtons.notify: {
                const allVoiceChannels = guild.channels.cache.filter((chn) => chn.type === ChannelType.GuildVoice);
                const raidLeaderEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Введите текст оповещения для участников или оставьте шаблон")
                    .setDescription(`Рейдер, тебя оповестил ${raidData.creator === interaction.user.id ? "создатель рейда" : "администратор"} об скором старте.\n\nЗаходи в голосовой канал как можно скорее!`);
                const invite = await member.voice.channel?.createInvite({ reason: "Raid invite", maxAge: 60 * 120 });
                const raidVoiceChannels = member.guild.channels.cache
                    .filter((chn) => chn.parentId === ids.raidChnCategoryId && chn.type === ChannelType.GuildVoice && chn.name.includes("Raid"))
                    .reverse();
                const raidChnInvite = [];
                for await (const [i, chn] of raidVoiceChannels) {
                    if (chn.type === ChannelType.GuildVoice &&
                        (chn.userLimit === 0 || chn.userLimit - 6 > chn.members.size || chn.members.has(raidData.creator))) {
                        raidChnInvite.push(await chn.createInvite({ reason: "Raid invite", maxAge: 60 * 120 }));
                        break;
                    }
                }
                const components = [
                    new ButtonBuilder().setCustomId(RaidButtons.confirmNotify).setLabel("Отправить").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(RaidButtons.editNotify).setLabel("Изменить текст").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(RaidButtons.notifyCancel).setLabel("Отменить оповещение").setStyle(ButtonStyle.Danger),
                ];
                const linkComponent = [];
                invite ? linkComponent.push(new ButtonBuilder({ style: ButtonStyle.Link, url: invite.url, label: "Перейти к создателю рейда" })) : "";
                raidChnInvite.forEach((invite) => {
                    linkComponent.push(new ButtonBuilder({
                        style: ButtonStyle.Link,
                        url: invite.url || "https://discord.gg/",
                        label: "Перейти в рейдовый канал",
                    }));
                });
                const m = await interaction.user.send({
                    embeds: [raidLeaderEmbed],
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: components,
                        },
                    ],
                });
                const collector = m.createMessageComponentCollector({ filter: (interaction) => interaction.user.id === member.id, time: 60 * 1000 });
                collector.on("collect", async (int) => {
                    switch (int.customId) {
                        case RaidAdditionalFunctional.confirm: {
                            collector.stop("completed");
                            const sendedTo = [];
                            raidLeaderEmbed.setTitle(`Рейдовое оповещение ${raidData.id}-${raidData.raid}`);
                            const raidMembersLength = interaction.user.id === raidData.creator ? raidData.joined.length - 1 : raidData.joined.length;
                            await Promise.all(allVoiceChannels.map(async (chn) => {
                                if (chn.isVoiceBased() && !chn.members.has(raidData.creator) && chn.parent?.id !== ids.raidChnCategoryId) {
                                    await Promise.all(raidData.joined.map(async (member) => {
                                        if (chn.members.has(member)) {
                                            raidData.joined.splice(raidData.joined.indexOf(member), 1);
                                            const user = chn.members.get(member);
                                            await user
                                                .send({
                                                embeds: [raidLeaderEmbed],
                                                components: [
                                                    {
                                                        type: ComponentType.ActionRow,
                                                        components: linkComponent,
                                                    },
                                                ],
                                            })
                                                .then((d) => sendedTo.push(`${user.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} получил оповещение`))
                                                .catch(async (e) => {
                                                if (e.code === 50007) {
                                                    await interaction
                                                        .channel.send(`<@${user.id}>, ${raidLeaderEmbed.data.description}`)
                                                        .then((d) => sendedTo.push(`${user.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} получил текстовое оповещение`));
                                                }
                                                else {
                                                    console.error(`[Error code: 1210]`, e);
                                                }
                                            });
                                        }
                                    }));
                                }
                                else if (chn.isVoiceBased() && chn.members.has(raidData.creator)) {
                                    chn.members.forEach((member) => {
                                        if (raidData.joined.includes(member.id))
                                            raidData.joined.splice(raidData.joined.indexOf(member.id), 1);
                                    });
                                }
                            }));
                            const compCont = [
                                {
                                    type: ComponentType.ActionRow,
                                    components: linkComponent,
                                },
                            ];
                            await Promise.all(raidData.joined.map(async (id) => {
                                const member = guild.members.cache.get(id);
                                if (!member)
                                    return console.error(`[Error code: 1211]`, id, member);
                                if (member.id === raidData.creator)
                                    return;
                                await member
                                    .send({
                                    embeds: [raidLeaderEmbed],
                                    components: linkComponent.length > 0 ? compCont : undefined,
                                })
                                    .then((d) => sendedTo.push(`${member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} получил оповещение`))
                                    .catch(async (e) => {
                                    if (e.code === 50007) {
                                        await interaction
                                            .channel.send(`<@${member.id}>, ${raidLeaderEmbed.data.description}`)
                                            .then((d) => sendedTo.push(`${member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} получил текстовое оповещение`));
                                    }
                                    else {
                                        console.error(`[Error code: 1212]`, e.requestBody.json.components);
                                    }
                                });
                            }));
                            const finishEmbed = new EmbedBuilder()
                                .setColor("Green")
                                .setTitle(`Оповещение было доставлено ${sendedTo.length} участникам из ${raidMembersLength} записавшихся`);
                            sendedTo.length === 0 ? [] : finishEmbed.setDescription(sendedTo.join("\n") || "nothing");
                            m.edit({ components: [], embeds: [finishEmbed] }).catch((e) => `raidAddF ${e.code}`);
                            break;
                        }
                        case RaidAdditionalFunctional.edit: {
                            int.reply("Введите новый текст оповещения");
                            m.channel
                                .createMessageCollector({ time: 60 * 1000, max: 1, filter: (msg) => msg.author.id === member.id })
                                .on("collect", (collMsg) => {
                                raidLeaderEmbed.setDescription(collMsg.content || "nothing");
                                m.edit({ embeds: [raidLeaderEmbed] });
                            });
                            break;
                        }
                        case RaidAdditionalFunctional.cancel: {
                            m.edit({ components: [], embeds: [], content: "Оповещение участников отменено" });
                            collector.stop("canceled");
                            break;
                        }
                    }
                });
                collector.on("end", (_reason, r) => {
                    if (r === "time") {
                        const embed = EmbedBuilder.from(m.embeds[0]).setFooter({ text: "Время для редактирования вышло" });
                        m.edit({ components: [], embeds: [embed] });
                    }
                });
                break;
            }
            case RaidButtons.transfer: {
                const chnCol = guild.channels.cache.filter((chn) => chn.isVoiceBased() && chn.members.size > 0);
                const chnWithMembers = chnCol.each((chn) => {
                    if (chn.isVoiceBased() && chn.type === ChannelType.GuildVoice) {
                        return chn;
                    }
                    else {
                        return undefined;
                    }
                });
                const membersCollection = [];
                chnWithMembers.forEach((chns) => {
                    if (chns.type === ChannelType.GuildVoice) {
                        chns.members.forEach((memb) => membersCollection.push(memb));
                    }
                });
                const raidChns = guild.channels.cache.filter((chn) => chn.parentId === ids.raidChnCategoryId && chn.type === ChannelType.GuildVoice && chn.name.includes("Raid"));
                const freeRaidVC = raidChns.find((chn) => chn.type === ChannelType.GuildVoice && chn.members.has(raidData.creator)) ||
                    raidChns.find((chn) => chn.type === ChannelType.GuildVoice && chn.userLimit > chn.members.size);
                const movedUsers = [];
                const alreadyMovedUsers = [];
                await Promise.all(raidData.joined.map(async (jId) => {
                    const member = membersCollection.find((m) => m.id === jId);
                    if (member) {
                        if (!freeRaidVC || freeRaidVC.type !== ChannelType.GuildVoice)
                            return console.error(`[Error code: 1213]`, freeRaidVC);
                        if (!freeRaidVC.members.has(member.id)) {
                            await member.voice.setChannel(freeRaidVC, `${interaction.user.username} переместил участников в рейдовый голосовой`);
                            movedUsers.push(`${member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} был перемещен`);
                        }
                        else {
                            alreadyMovedUsers.push(`${member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} уже в канале`);
                        }
                    }
                }));
                const replyEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle(`${movedUsers.length}/${raidData.joined.length - alreadyMovedUsers.length} пользователей перемещено`)
                    .setDescription(`${movedUsers.join("\n") + "\n" + alreadyMovedUsers.join("\n")}`);
                await deferredReply;
                interaction.followUp({ ephemeral: true, embeds: [replyEmbed] });
                break;
            }
            case RaidButtons.unlock: {
                const components = interaction.message.components[0].components;
                const raidMsg = client.getCachedGuild().channels.cache.get(ids.raidChnId).messages.cache.get(raidData.messageId);
                let status = "закрыли";
                async function compRes(subC) {
                    if (subC) {
                        const msgComponents = components.map((component) => {
                            if (component.type == ComponentType.Button) {
                                if (component.label === "Закрыть набор") {
                                    status = "закрыли";
                                    return ButtonBuilder.from(component).setStyle(ButtonStyle.Success).setLabel("Открыть набор");
                                }
                                else if (component.label === "Открыть набор") {
                                    status = "открыли";
                                    return ButtonBuilder.from(component).setStyle(ButtonStyle.Danger).setLabel("Закрыть набор");
                                }
                                else {
                                    return ButtonBuilder.from(component);
                                }
                            }
                            else {
                                throw { name: "Found unknown button type", description: `${component.type}, ${raidData}` };
                            }
                        });
                        return msgComponents;
                    }
                    else {
                        const msgComponents = raidMsg.components[0].components.map((component) => {
                            if (component.type === ComponentType.Button) {
                                if (component.label === "Записаться" || component.label === "Возможно буду") {
                                    return ButtonBuilder.from(component).setDisabled(!component.disabled);
                                }
                                else {
                                    return ButtonBuilder.from(component);
                                }
                            }
                            else {
                                throw { name: "Found unknown join button type", description: `${component.type}, ${raidData}` };
                            }
                        });
                        return msgComponents;
                    }
                }
                raidMsg.edit({
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: await compRes(false),
                        },
                    ],
                });
                interaction.message.edit({
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: await compRes(true),
                        },
                    ],
                });
                const resEmbed = new EmbedBuilder().setColor(colors.success).setTitle(`Вы ${status} набор`);
                await deferredReply;
                interaction.followUp({ embeds: [resEmbed], ephemeral: true });
                break;
            }
            case RaidButtons.delete: {
                const embed = new EmbedBuilder().setColor(colors.warning).setTitle(`Подтвердите удаление рейда ${raidData.id}-${raidData.raid}`);
                const components = [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            new ButtonBuilder().setCustomId(RaidButtons.deleteConfirm).setLabel("Подтвердить").setStyle(ButtonStyle.Danger),
                            new ButtonBuilder().setCustomId(RaidButtons.deleteCancel).setLabel("Отменить").setStyle(ButtonStyle.Secondary),
                        ],
                    },
                ];
                await deferredReply;
                const msg = await interaction.followUp({
                    ephemeral: true,
                    embeds: [embed],
                    components: components,
                });
                const collector = msg.createMessageComponentCollector({ time: 60 * 1000, max: 1, filter: (i) => i.user.id === interaction.user.id });
                collector.on("collect", async (col) => {
                    if (col.customId.startsWith("raidAddFunc_delete_")) {
                        if (col.customId === "raidAddFunc_delete_confirm") {
                            const destroy = await RaidEvent.destroy({ where: { id: raidData.id } });
                            if (destroy === 1) {
                                try {
                                    await guild.channels.cache.get(raidData.channelId)?.delete(`${interaction.user.username} удалил рейд через кнопку(!)`);
                                }
                                catch (e) {
                                    console.error(`Channel during raid manual delete for raidId ${raidData.id} wasn't found`);
                                    e.code !== 10008 ? console.error(e) : console.error("raidDeleteBtn unknown msg err");
                                }
                                try {
                                    await (await client.getCachedGuild().channels.cache.get(ids.raidChnId).messages.fetch(raidData.messageId))?.delete();
                                }
                                catch (e) {
                                    console.error(`Message during raid manual delete for raidId ${raidData.id} wasn't found`);
                                    e.code !== 10008 ? console.error(e) : console.error("raidDeleteBtn unknown msg err");
                                }
                                const sucEmbed = new EmbedBuilder()
                                    .setColor(colors.success)
                                    .setTitle(`Рейд ${raidData.id}-${raidData.raid} удален`)
                                    .setTimestamp();
                                col.update({ components: [], embeds: [sucEmbed] });
                            }
                            else {
                                console.error(`Error during delete raid ${raidData.id}`, destroy, raidData);
                                const errEmbed = new EmbedBuilder()
                                    .setColor("DarkGreen")
                                    .setTitle(`Произошла ошибка во время удаления`)
                                    .setDescription(`Было удалено ${destroy} рейдов`);
                                col.update({ embeds: [errEmbed], components: [] });
                            }
                        }
                        else if (col.customId === "raidAddFunc_delete_cancel") {
                            const canceledEmbed = new EmbedBuilder().setColor("Grey").setTitle("Удаление рейда отменено");
                            col.update({ components: [], embeds: [canceledEmbed] });
                        }
                    }
                });
                break;
            }
            case RaidButtons.resend: {
                return interaction.channel?.send({ embeds: [interaction.message.embeds[0]], components: interaction.message.components }).then((msg) => {
                    RaidEvent.update({ inChannelMessageId: msg.id }, { where: { channelId: interaction.channelId } }).then(async (response) => {
                        interaction.message.delete();
                        const embed = new EmbedBuilder().setColor("Green").setTitle("Сообщение обновлено");
                        await deferredReply;
                        interaction.followUp({ embeds: [embed], ephemeral: true });
                    });
                });
            }
            case RaidButtons.startActivityChecker: {
                if (interaction.user.id !== raidData.creator || !interaction.member?.permissions.has("Administrator"))
                    (await deferredReply) && interaction.followUp({ content: "Under development", ephemeral: true });
                const authData = await AuthData.findByPk(raidData.creator, { attributes: ["bungieId", "platform", "accessToken"] });
                if (!authData)
                    throw { errorType: UserErrors.DB_USER_NOT_FOUND };
                async function getActiveCharacter(response) {
                    if (!response.characterActivities.data)
                        throw { name: "Персонажи не найдены" };
                    const characterIds = Object.keys(response.characterActivities.data);
                    for await (const characterId of characterIds) {
                        if (response.characterActivities.data[characterId].currentActivityModeType === 4)
                            return { characterId, isFound: true };
                        if (response.characterActivities.data[characterId].currentActivityModeHash === 2166136261)
                            return { characterId, isFound: true };
                    }
                    return { characterId: characterIds[0], isFound: false };
                }
                const { characterId: character, isFound } = await getActiveCharacter((await fetchRequest(`/Platform/Destiny2/${authData.platform}/Profile/${authData.bungieId}/?components=204`, authData.accessToken)));
                await activityCompletionChecker(authData, raidData, character);
                (await deferredReply) &&
                    interaction.followUp({
                        content: `Started for char ${character}\n${isFound ? `Character found in raid activity` : `Character **not found** in raid activity`}`,
                        ephemeral: true,
                    });
                return;
            }
            case RaidButtons.endActivityChecker: {
                if (interaction.user.id !== raidData.creator || !interaction.member?.permissions.has("Administrator"))
                    (await deferredReply) && interaction.followUp({ content: "Under development", ephemeral: true });
                const content = await activityCompletionCheckerCancel(raidData);
                (await deferredReply) && interaction.followUp({ content, ephemeral: true });
                return;
            }
            case RaidButtons.invite: {
                if (interaction.user.id !== ownerId)
                    (await deferredReply) && interaction.followUp({ content: "Under development", ephemeral: true });
                return;
            }
            default:
                console.log(`[Error code: 1216] rainInChnButton default case response`, interaction.customId);
                break;
        }
    },
};
