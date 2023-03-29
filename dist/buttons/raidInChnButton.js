import { ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, } from "discord.js";
import { Op } from "sequelize";
import { RaidAdditionalFunctional, RaidButtons } from "../configs/Buttons.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import { guildId, ids } from "../configs/ids.js";
import { getRandomGIF } from "../utils/general/utilities.js";
import { RaidEvent } from "../utils/persistence/sequelize.js";
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
                attributes: attributes,
            })
            : RaidEvent.findOne({ where: { inChannelMessageId: interaction.message.id }, attributes: attributes });
        const guild = interaction.guild || client.getCachedGuild() || (await client.guilds.fetch(guildId));
        const member = client.getCachedMembers().get(interaction.user.id) || (await guild.members.fetch(interaction.user.id));
        if (!member) {
            throw {
                name: "Вы не участник сервера",
                description: "Пожалуйста, объясните администрации как вы получили эту ошибку",
            };
        }
        if (!guild)
            throw { name: "Ошибка. Сервер недоступен" };
        const raidData = await raidDataQuery;
        if (!raidData) {
            if (interaction.channel?.isDMBased())
                interaction.message.edit({ components: [] });
            throw { errorType: UserErrors.RAID_NOT_FOUND };
        }
        if (raidData.creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator")) {
            throw { errorType: UserErrors.RAID_MISSING_PERMISSIONS };
        }
        if (interaction.customId === RaidButtons.notify) {
            const allVoiceChannels = guild.channels.cache.filter((chn) => chn.type === ChannelType.GuildVoice);
            const raidLeaderEmbed = new EmbedBuilder()
                .setColor(colors.default)
                .setTitle("Введите текст оповещения для участников или оставьте шаблон")
                .setDescription(`Рейдер, тебя оповестил ${raidData.creator === interaction.user.id ? "создатель рейда" : "администратор"} об скором старте.\n\nЗаходи в голосовой канал как можно скорее!`)
                .setImage(await getRandomGIF("raid time"));
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
            invite
                ? linkComponent.push(new ButtonBuilder({ style: ButtonStyle.Link, url: invite.url, label: "Перейти к создателю рейда" }))
                : "";
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
                        components,
                    },
                ],
            });
            const collector = m.createMessageComponentCollector({
                filter: (interaction) => interaction.user.id === member.id,
                time: 60 * 1000,
            });
            collector.on("collect", async (int) => {
                const channel = interaction.channel;
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
                                                await channel
                                                    .send(`<@${user.id}>, ${raidLeaderEmbed.data.description}`)
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
                                    await channel
                                        .send(`<@${member.id}>, ${raidLeaderEmbed.data.description}`)
                                        .then((d) => sendedTo.push(`${member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} получил текстовое оповещение`));
                                }
                                else {
                                    console.error(`[Error code: 1212]`, e.requestBody.json.components);
                                }
                            });
                        }));
                        const finishEmbed = new EmbedBuilder()
                            .setColor(colors.success)
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
        }
        else if (interaction.customId === RaidButtons.transfer) {
            const deferredReply = interaction.deferUpdate();
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
                .setColor(colors.success)
                .setTitle(`${movedUsers.length}/${raidData.joined.length - alreadyMovedUsers.length} пользователей перемещено`)
                .setDescription(`${movedUsers.join("\n") + "\n" + alreadyMovedUsers.join("\n")}`);
            (await deferredReply) && interaction.followUp({ ephemeral: true, embeds: [replyEmbed] });
        }
        else if (interaction.customId === RaidButtons.unlock) {
            const raidChannel = client.getCachedTextChannel(ids.raidChnId) || (await client.getCachedGuild().channels.fetch(ids.raidChnId));
            const raidMsg = raidChannel.messages.cache.get(raidData.messageId) || (await raidChannel.messages.fetch(raidData.messageId));
            let status = "закрыли";
            async function raidButtonsUnlocker() {
                const inChannelMessageButtonRows = interaction.message.components.map((actionRow) => {
                    const inChannelMessageButtons = actionRow.components.map((component) => {
                        const unlockButton = component;
                        if (component.customId === RaidButtons.unlock && unlockButton) {
                            if (unlockButton.label === "Закрыть набор") {
                                status = "закрыли";
                                return ButtonBuilder.from(unlockButton).setStyle(ButtonStyle.Success).setLabel("Открыть набор");
                            }
                            else if (unlockButton.label === "Открыть набор") {
                                status = "открыли";
                                return ButtonBuilder.from(unlockButton).setStyle(ButtonStyle.Danger).setLabel("Закрыть набор");
                            }
                        }
                        return ButtonBuilder.from(unlockButton);
                    });
                    return inChannelMessageButtons;
                });
                const raidMessageButtonRows = raidMsg.components.map((actionRow) => {
                    const raidMessageButtons = actionRow.components.map((component) => {
                        if (component.type === ComponentType.Button) {
                            if (component.customId === RaidButtons.join || component.customId === RaidButtons.alt) {
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
                    return raidMessageButtons;
                });
                return [raidMessageButtonRows, inChannelMessageButtonRows];
            }
            const [components, inChannelComponents] = await raidButtonsUnlocker();
            raidMsg.edit({
                components: components.map((components) => {
                    return { components, type: ComponentType.ActionRow };
                }),
            });
            interaction.message.edit({
                components: inChannelComponents.map((components) => {
                    return { components, type: ComponentType.ActionRow };
                }),
            });
            const resEmbed = new EmbedBuilder().setColor(colors.success).setTitle(`Вы ${status} набор`);
            interaction.reply({ embeds: [resEmbed], ephemeral: true });
        }
        else if (interaction.customId === RaidButtons.delete) {
            await interaction.deferUpdate();
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
            const msg = await interaction.followUp({
                ephemeral: true,
                embeds: [embed],
                components,
            });
            const collector = interaction.channel.createMessageComponentCollector({
                message: msg,
                time: 60 * 1000,
                max: 1,
                filter: (i) => i.user.id === interaction.user.id,
            });
            collector.on("collect", async (col) => {
                if (col.customId === RaidButtons.deleteConfirm) {
                    const destroy = await RaidEvent.destroy({ where: { id: raidData.id } });
                    if (destroy === 1) {
                        try {
                            await (guild.channels.cache.get(raidData.channelId) || (await guild.channels.fetch(raidData.channelId)))?.delete(`${interaction.user.username} удалил рейд через кнопку`);
                        }
                        catch (e) {
                            console.error(`[Error code: 1426] Channel during raid manual delete for raidId ${raidData.id} wasn't found`);
                            e.code !== 10008 ? console.error(e) : console.error("[Error code: 1427] raidDeleteBtn unknown msg err");
                        }
                        try {
                            await (await client.getCachedTextChannel(ids.raidChnId).messages.fetch(raidData.messageId))?.delete();
                        }
                        catch (e) {
                            console.error(`[Error code: 1424] Message during raid manual delete for raidId ${raidData.id} wasn't found`);
                            e.code !== 10008 ? console.error(e) : console.error("[Error code: 1425] raidDeleteBtn unknown msg err");
                        }
                        const sucEmbed = new EmbedBuilder().setColor(colors.success).setTitle(`Рейд ${raidData.id}-${raidData.raid} удален`);
                        col.update({ components: [], embeds: [sucEmbed] });
                        if (interaction.channel?.isDMBased())
                            interaction.message.edit({ components: [] });
                    }
                    else {
                        console.error(`[Error code: 1423] Error during delete raid ${raidData.id}`, destroy, raidData);
                        const errEmbed = new EmbedBuilder()
                            .setColor("DarkGreen")
                            .setTitle(`Произошла ошибка во время удаления`)
                            .setDescription(`Было удалено ${destroy} рейдов`);
                        col.update({ embeds: [errEmbed], components: [] });
                        if (interaction.channel?.isDMBased())
                            interaction.message.edit({ components: [] });
                    }
                }
                else if (col.customId === RaidButtons.deleteCancel) {
                    const canceledEmbed = new EmbedBuilder().setColor(colors.warning).setTitle("Удаление рейда отменено");
                    col.update({ components: [], embeds: [canceledEmbed] });
                }
            });
            collector.on("end", async (r, reason) => {
                if (reason === "time") {
                    embed.setTitle(`Время для удаления вышло. Повторите снова`).setColor("DarkButNotBlack");
                    interaction.editReply({ components: [], embeds: [embed] });
                }
            });
        }
        else if (interaction.customId === RaidButtons.resend) {
            const deferredReply = interaction.deferUpdate();
            return interaction.channel
                .send({ embeds: [interaction.message.embeds[0]], components: interaction.message.components })
                .then((msg) => {
                RaidEvent.update({ inChannelMessageId: msg.id }, { where: { channelId: interaction.channelId } }).then(async () => {
                    interaction.message.delete();
                    const embed = new EmbedBuilder().setColor(colors.success).setTitle("Сообщение обновлено");
                    (await deferredReply) && interaction.followUp({ embeds: [embed], ephemeral: true });
                });
            });
        }
        else if (interaction.customId === RaidButtons.invite) {
            interaction.reply({ content: "Under development", ephemeral: true });
        }
    },
};