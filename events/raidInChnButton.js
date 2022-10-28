import { ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, GuildMember } from "discord.js";
import { Op } from "sequelize";
import { msgFetcher } from "../base/channels.js";
import { colors } from "../base/colors.js";
import { guildId, ids } from "../base/ids.js";
import { raids } from "../handlers/sequelize.js";
export default {
    callback: async (client, interaction, _member, _guild, _channel) => {
        if (interaction.isButton() && interaction.customId.startsWith("raidInChnButton")) {
            const deferredReply = interaction.deferUpdate();
            const buttonId = interaction.customId;
            const inChnMsg = interaction.message.id;
            const raidData = interaction.channel?.isDMBased()
                ? await raids.findOne({
                    where: {
                        [Op.and]: [
                            { id: parseInt(interaction.message.embeds[0].data.footer?.text.split("RId: ").pop()) },
                            { creator: interaction.user.id },
                        ],
                    },
                })
                : await raids.findOne({ where: { inChnMsg: inChnMsg } });
            const member = interaction.member instanceof GuildMember ? interaction.member : client.guilds.cache.get(guildId)?.members.cache.get(interaction.user.id);
            const guild = interaction.guild || client.guilds.cache.get(guildId);
            if (!member) {
                throw {
                    member: interaction.member,
                    name: "Вы не участник сервера",
                    message: "Пожалуйста, объясните администрации как вы получили эту ошибку",
                };
            }
            if (!guild) {
                throw { interaction: interaction, name: "Ошибка, этот сервер недоступен" };
            }
            if (!raidData) {
                if (interaction.channel?.isDMBased())
                    interaction.message.edit({ components: [] });
                throw {
                    name: "Критическая ошибка",
                    message: "Рейд не найден. Повторите спустя несколько секунд\nПожалуйста, не нажимайте кнопку более 2х раз - за каждую такую ошибку администрация получает оповещение",
                };
            }
            if (raidData.creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator")) {
                throw {
                    interaction: interaction,
                    name: "Ошибка. Недостаточно прав",
                    message: `Изменение набора доступно только создателю рейда - <@${raidData.creator}>`,
                };
            }
            switch (buttonId) {
                case "raidInChnButton_notify": {
                    const voiceChn = guild.channels.cache.filter((chn) => chn.type === ChannelType.GuildVoice);
                    const embedForLeader = new EmbedBuilder()
                        .setColor(colors.default)
                        .setTitle("Введите текст оповещения для участников или оставьте шаблон")
                        .setDescription(`Вас оповестил ${raidData.creator === interaction.user.id ? "создатель рейда" : "Администратор"} об скором начале рейда!\nЗаходите в голосовой канал, рейд не ждет!`);
                    const invite = await member.voice.channel?.createInvite({ reason: "Raid invite", maxAge: 60 * 120 });
                    const raidChnInvite = member.guild.channels.cache
                        .filter((chn) => chn.parentId === ids.raidChnCategoryId && chn.type === ChannelType.GuildVoice && chn.name.includes("Raid Room"))
                        .map(async (chn) => {
                        if (chn.type === ChannelType.GuildVoice) {
                            if (chn.userLimit > chn.members.size || chn.members.has(raidData.creator)) {
                                return await chn.createInvite({ reason: "Raid invite", maxAge: 60 * 120 });
                            }
                            else {
                                return undefined;
                            }
                        }
                        else {
                            return undefined;
                        }
                    });
                    const components = [
                        new ButtonBuilder().setCustomId("raidAddFunc_notify_confirm").setLabel("Отправить").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId("raidAddFunc_notify_edit").setLabel("Изменить текст").setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId("raidAddFunc_notify_cancel").setLabel("Отменить оповещение").setStyle(ButtonStyle.Danger),
                    ];
                    const linkComponent = [];
                    invite ? linkComponent.push(new ButtonBuilder({ style: ButtonStyle.Link, url: invite.url, label: "Перейти к создателю рейда" })) : "";
                    (await raidChnInvite[0]) && raidChnInvite[0] !== undefined
                        ? linkComponent.push(new ButtonBuilder({
                            style: ButtonStyle.Link,
                            url: (await raidChnInvite[0])?.url || "https://discord.gg/",
                            label: "Перейти в канал сбора",
                        }))
                        : [];
                    const m = await interaction.user.send({
                        embeds: [embedForLeader],
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
                            case "raidAddFunc_notify_confirm": {
                                collector.stop("completed");
                                const sendedTo = [];
                                embedForLeader.setTitle(`Оповещение об рейде ${raidData.id}-${raidData.raid}`);
                                const raidMembersLength = interaction.user.id === raidData.creator ? raidData.joined.length - 1 : raidData.joined.length;
                                await Promise.all(voiceChn.map(async (chn) => {
                                    if (chn.isVoiceBased() && !chn.members.has(raidData.creator) && chn.parent?.id !== ids.raidChnCategoryId) {
                                        await Promise.all(raidData.joined.map(async (member) => {
                                            if (chn.members.has(member)) {
                                                raidData.joined.splice(raidData.joined.indexOf(member), 1);
                                                const user = chn.members.get(member);
                                                await user
                                                    .send({
                                                    embeds: [embedForLeader],
                                                    components: [
                                                        {
                                                            type: ComponentType.ActionRow,
                                                            components: linkComponent,
                                                        },
                                                    ],
                                                })
                                                    .then((d) => sendedTo.push(`${user.displayName} получил оповещение`))
                                                    .catch(async (e) => {
                                                    if (e.code === 50007) {
                                                        await interaction
                                                            .channel.send(`<@${user.id}>, ${embedForLeader.data.description}`)
                                                            .then((d) => sendedTo.push(`${user.displayName} получил текстовое оповещение`));
                                                    }
                                                    else {
                                                        console.error(`raid user notify err`, e);
                                                    }
                                                });
                                            }
                                        }));
                                    }
                                    else if (chn.isVoiceBased() && chn.members.has(raidData.creator)) {
                                        chn.members.forEach((member) => {
                                            if (raidData.joined.includes(member.id)) {
                                                raidData.joined.splice(raidData.joined.indexOf(member.id), 1);
                                            }
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
                                        return console.error(`error during raidNotify, member not found`, id, member);
                                    if (member.id === raidData.creator)
                                        return;
                                    await member
                                        .send({
                                        embeds: [embedForLeader],
                                        components: linkComponent.length > 0 ? compCont : undefined,
                                    })
                                        .then((d) => sendedTo.push(`${member.displayName} получил оповещение`))
                                        .catch(async (e) => {
                                        if (e.code === 50007) {
                                            await interaction
                                                .channel.send(`<@${member.id}>, ${embedForLeader.data.description}`)
                                                .then((d) => sendedTo.push(`${member.displayName} получил текстовое оповещение`));
                                        }
                                        else {
                                            console.error(`raid member notify err`, e.requestBody.json.components);
                                        }
                                    });
                                }));
                                const finishEmbed = new EmbedBuilder()
                                    .setColor("Green")
                                    .setTitle(`Оповещение было доставлено ${sendedTo.length}/${raidMembersLength} участникам`);
                                sendedTo.length === 0 ? [] : finishEmbed.setDescription(sendedTo.join("\n"));
                                m.edit({ components: [], embeds: [finishEmbed] }).catch((e) => `raidAddF ${e.code}`);
                                break;
                            }
                            case "raidAddFunc_notify_edit": {
                                int.reply("Введите новый текст оповещения");
                                m.channel
                                    .createMessageCollector({ time: 60 * 1000, max: 1, filter: (msg) => msg.author.id === member.id })
                                    .on("collect", (collMsg) => {
                                    embedForLeader.setDescription(collMsg.content);
                                    m.edit({ embeds: [embedForLeader] });
                                });
                                break;
                            }
                            case "raidAddFunc_notify_cancel": {
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
                case "raidInChnButton_transfer": {
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
                    const raidChns = guild.channels.cache.filter((chn) => chn.parentId === ids.raidChnCategoryId && chn.type === ChannelType.GuildVoice && chn.name.includes("Raid Room"));
                    const freeRaidVC = raidChns.find((chn) => chn.type === ChannelType.GuildVoice && chn.members.has(raidData.creator)) ||
                        raidChns.find((chn) => chn.type === ChannelType.GuildVoice && chn.userLimit > chn.members.size);
                    const movedUsers = [];
                    const alreadyMovedUsers = [];
                    await Promise.all(raidData.joined.map(async (jId) => {
                        const member = membersCollection.find((m) => m.id === jId);
                        if (member) {
                            if (!freeRaidVC || freeRaidVC.type !== ChannelType.GuildVoice)
                                return console.error(`raidChntransfer err, chn is broken`, freeRaidVC);
                            if (!freeRaidVC.members.has(member.id)) {
                                await member.voice.setChannel(freeRaidVC, `${interaction.user.username} переместил участников в рейдовый голосовой`);
                                movedUsers.push(`${member.displayName} был перемещен`);
                            }
                            else {
                                alreadyMovedUsers.push(`${member.displayName} уже в канале`);
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
                case "raidInChnButton_unlock": {
                    const components = interaction.message.components[0].components;
                    const raidMsg = msgFetcher(ids.raidChnId, raidData.msgId);
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
                                    throw { name: "Found unknown button type", message: `${component.type}, ${raidData}` };
                                }
                            });
                            return msgComponents;
                        }
                        else {
                            const msgComponents = (await raidMsg).components[0].components.map((component) => {
                                if (component.type === ComponentType.Button) {
                                    if (component.label === "Записаться" || component.label === "Возможно буду") {
                                        return ButtonBuilder.from(component).setDisabled(!component.disabled);
                                    }
                                    else {
                                        return ButtonBuilder.from(component);
                                    }
                                }
                                else {
                                    throw { name: "Found unknown join button type", message: `${component.type}, ${raidData}` };
                                }
                            });
                            return msgComponents;
                        }
                    }
                    (await raidMsg).edit({
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
                    const resEmbed = new EmbedBuilder().setColor("Green").setTitle(`Вы ${status} набор`);
                    await deferredReply;
                    interaction.followUp({ embeds: [resEmbed], ephemeral: true });
                    break;
                }
                case "raidInChnButton_delete": {
                    const embed = new EmbedBuilder().setColor("Yellow").setTitle(`Подтвердите удаление рейда ${raidData.id}-${raidData.raid}`);
                    const components = [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder().setCustomId("raidAddFunc_delete_confirm").setLabel("Подтвердить").setStyle(ButtonStyle.Danger),
                                new ButtonBuilder().setCustomId("raidAddFunc_delete_cancel").setLabel("Отменить").setStyle(ButtonStyle.Secondary),
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
                                const destroy = await raids.destroy({ where: { id: raidData.id } });
                                if (destroy === 1) {
                                    try {
                                        await guild.channels.cache.get(raidData.chnId)?.delete(`${interaction.user.username} удалил рейд через кнопку(!)`);
                                    }
                                    catch (e) {
                                        console.error(`Channel during raid manual delete for raidId ${raidData.id} wasn't found`);
                                        e.code !== 10008 ? console.error(e) : console.error("raidDeleteBtn unknown msg err");
                                    }
                                    try {
                                        await (await msgFetcher(ids.raidChnId, raidData.msgId)).delete();
                                    }
                                    catch (e) {
                                        console.error(`Message during raid manual delete for raidId ${raidData.id} wasn't found`);
                                        e.code !== 10008 ? console.error(e) : console.error("raidDeleteBtn unknown msg err");
                                    }
                                    const sucEmbed = new EmbedBuilder()
                                        .setColor("Green")
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
                case "raidInChnButton_resend": {
                    return interaction.channel
                        ?.send({ embeds: [interaction.message.embeds[0]], components: interaction.message.components })
                        .then((msg) => {
                        raids.update({ inChnMsg: msg.id }, { where: { chnId: interaction.channelId } }).then(async (response) => {
                            interaction.message.delete();
                            const embed = new EmbedBuilder().setColor("Green").setTitle("Сообщение обновлено");
                            await deferredReply;
                            interaction.followUp({ embeds: [embed], ephemeral: true });
                        });
                    });
                }
                default:
                    console.log(`rainInChnButton default case response`, interaction.customId);
                    break;
            }
        }
    },
};
