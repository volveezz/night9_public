"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const sequelize_1 = require("sequelize");
const channels_1 = require("../base/channels");
const colors_1 = require("../base/colors");
const ids_1 = require("../base/ids");
const sequelize_2 = require("../handlers/sequelize");
exports.default = {
    callback: (client, interaction, _member, guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        if (interaction.isButton() && interaction.customId.startsWith("raidInChnButton")) {
            yield interaction.deferUpdate();
            const buttonId = interaction.customId;
            const inChnMsg = interaction.message.id;
            const raidData = !interaction.channel
                ? yield sequelize_2.raids.findOne({
                    where: {
                        [sequelize_1.Op.and]: [
                            { id: (_b = (_a = interaction.message.embeds[0].data.footer) === null || _a === void 0 ? void 0 : _a.text.split(` | `).shift()) === null || _b === void 0 ? void 0 : _b.split("RId: ").shift() },
                            { creator: interaction.user.id },
                        ],
                    },
                })
                : yield sequelize_2.raids.findOne({ where: { inChnMsg: inChnMsg } });
            const member = interaction.member instanceof discord_js_1.GuildMember ? interaction.member : (_c = client.guilds.cache.get(ids_1.guildId)) === null || _c === void 0 ? void 0 : _c.members.cache.get(interaction.user.id);
            if (!member) {
                console.log(`raidInChnButton error, member not found`, interaction.member);
                throw { interaction: interaction, name: "Вы не участник сервера", message: "Пожалуйста, объясните администрации как вы получили эту ошибку" };
            }
            if (!interaction.guild) {
                throw { interaction: interaction, name: "Ошибка, этот сервер недоступен" };
            }
            if (!raidData) {
                throw {
                    interaction: interaction,
                    name: "Критическая ошибка",
                    message: "Рейд не найден. Повторите спустя несколько секунд\nПожалуйста, не нажимайте кнопку более 2х раз - за каждую такую ошибку администрация получает оповещение",
                };
            }
            if (raidData.creator !== interaction.user.id && !((_d = interaction.memberPermissions) === null || _d === void 0 ? void 0 : _d.has("Administrator"))) {
                throw {
                    interaction: interaction,
                    name: "Ошибка. Недостаточно прав",
                    message: `Изменение набора доступно только создателю рейда - <@${raidData.creator}>`,
                };
            }
            switch (buttonId) {
                case "raidInChnButton_notify": {
                    const voiceChn = interaction.guild.channels.cache.filter((chn) => chn.type === discord_js_1.ChannelType.GuildVoice);
                    const embedForLeader = new discord_js_1.EmbedBuilder()
                        .setColor(colors_1.colors.default)
                        .setTitle("Введите текст оповещения для участников или оставьте шаблон")
                        .setDescription(`Вас оповестил ${raidData.creator === interaction.user.id ? "создатель рейда" : "Администратор"} об скором начале рейда!\nЗаходите в голосовой канал, рейд не ждет!`);
                    const invite = yield ((_e = member.voice.channel) === null || _e === void 0 ? void 0 : _e.createInvite({ reason: "Raid invite", maxAge: 60 * 120 }));
                    const raidChnInvite = member.guild.channels.cache
                        .filter((chn) => chn.parentId === ids_1.ids.raidChnCategoryId && chn.type === discord_js_1.ChannelType.GuildVoice && chn.name.includes("Raid Room"))
                        .map((chn) => __awaiter(void 0, void 0, void 0, function* () {
                        if (chn.type === discord_js_1.ChannelType.GuildVoice) {
                            if (chn.userLimit > chn.members.size || chn.members.has(raidData.creator)) {
                                return yield chn.createInvite({ reason: "Raid invite", maxAge: 60 * 120 });
                            }
                            else {
                                return undefined;
                            }
                        }
                        else {
                            return undefined;
                        }
                    }));
                    const components = [
                        new discord_js_1.ButtonBuilder().setCustomId("raidAddFunc_notify_confirm").setLabel("Отправить").setStyle(discord_js_1.ButtonStyle.Primary),
                        new discord_js_1.ButtonBuilder().setCustomId("raidAddFunc_notify_edit").setLabel("Изменить текст").setStyle(discord_js_1.ButtonStyle.Secondary),
                        new discord_js_1.ButtonBuilder().setCustomId("raidAddFunc_notify_cancel").setLabel("Отменить оповещение").setStyle(discord_js_1.ButtonStyle.Danger),
                    ];
                    const linkComponent = [];
                    invite ? linkComponent.push(new discord_js_1.ButtonBuilder({ style: discord_js_1.ButtonStyle.Link, url: invite.url, label: "Перейти к создателю рейда" })) : "";
                    (yield raidChnInvite[0]) && raidChnInvite[0] !== undefined
                        ? linkComponent.push(new discord_js_1.ButtonBuilder({
                            style: discord_js_1.ButtonStyle.Link,
                            url: ((_f = (yield raidChnInvite[0])) === null || _f === void 0 ? void 0 : _f.url) || "https://discord.gg/",
                            label: "Перейти в канал сбора",
                        }))
                        : [];
                    const m = yield interaction.user.send({
                        embeds: [embedForLeader],
                        components: [
                            {
                                type: discord_js_1.ComponentType.ActionRow,
                                components: components,
                            },
                        ],
                    });
                    const collector = m.createMessageComponentCollector({ filter: (interaction) => interaction.user.id === member.id, time: 60 * 1000 });
                    collector.on("collect", (int) => __awaiter(void 0, void 0, void 0, function* () {
                        switch (int.customId) {
                            case "raidAddFunc_notify_confirm": {
                                collector.stop("completed");
                                const sendedTo = [];
                                embedForLeader.setTitle(`Оповещение об рейде ${raidData.id}-${raidData.raid}`);
                                const raidMembersLength = interaction.user.id === raidData.creator ? raidData.joined.length - 1 : raidData.joined.length;
                                yield Promise.all(voiceChn.map((chn) => __awaiter(void 0, void 0, void 0, function* () {
                                    var _g;
                                    if (chn.isVoiceBased() && !chn.members.has(raidData.creator) && ((_g = chn.parent) === null || _g === void 0 ? void 0 : _g.id) !== ids_1.ids.raidChnCategoryId) {
                                        yield Promise.all(raidData.joined.map((member) => __awaiter(void 0, void 0, void 0, function* () {
                                            if (chn.members.has(member)) {
                                                raidData.joined.splice(raidData.joined.indexOf(member), 1);
                                                const user = chn.members.get(member);
                                                yield user
                                                    .send({
                                                    embeds: [embedForLeader],
                                                    components: [
                                                        {
                                                            type: discord_js_1.ComponentType.ActionRow,
                                                            components: linkComponent,
                                                        },
                                                    ],
                                                })
                                                    .then((d) => sendedTo.push(`${user.displayName} получил оповещение`))
                                                    .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
                                                    if (e.code === 50007) {
                                                        yield interaction
                                                            .channel.send(`<@${user.id}>, ${embedForLeader.data.description}`)
                                                            .then((d) => sendedTo.push(`${user.displayName} получил текстовое оповещение`));
                                                    }
                                                    else {
                                                        console.error(`raid user notify err`, e);
                                                    }
                                                }));
                                            }
                                        })));
                                    }
                                    else if (chn.isVoiceBased() && chn.members.has(raidData.creator)) {
                                        chn.members.forEach((member) => {
                                            if (raidData.joined.includes(member.id)) {
                                                raidData.joined.splice(raidData.joined.indexOf(member.id), 1);
                                            }
                                        });
                                    }
                                })));
                                const compCont = [
                                    {
                                        type: discord_js_1.ComponentType.ActionRow,
                                        components: linkComponent,
                                    },
                                ];
                                yield Promise.all(raidData.joined.map((id) => __awaiter(void 0, void 0, void 0, function* () {
                                    const member = interaction.guild.members.cache.get(id);
                                    if (!member)
                                        return console.error(`error during raidNotify, member not found`, id, member);
                                    if (member.id === raidData.creator)
                                        return;
                                    yield member
                                        .send({
                                        embeds: [embedForLeader],
                                        components: linkComponent.length > 0 ? compCont : undefined,
                                    })
                                        .then((d) => sendedTo.push(`${member.displayName} получил оповещение`))
                                        .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
                                        if (e.code === 50007) {
                                            yield interaction
                                                .channel.send(`<@${member.id}>, ${embedForLeader.data.description}`)
                                                .then((d) => sendedTo.push(`${member.displayName} получил текстовое оповещение`));
                                        }
                                        else {
                                            console.error(`raid member notify err`, e.requestBody.json.components);
                                        }
                                    }));
                                })));
                                const finishEmbed = new discord_js_1.EmbedBuilder()
                                    .setColor("Green")
                                    .setTitle(`Оповещение было доставлено ${sendedTo.length}/${raidMembersLength} участникам`);
                                sendedTo.length === 0 ? [] : finishEmbed.setDescription(sendedTo.join("\n"));
                                m.edit({ components: [], embeds: [finishEmbed] }).catch((e) => `raidAddF ${e.code}`);
                                break;
                            }
                            case "raidAddFunc_notify_edit": {
                                int.reply("Введите новый текст оповещения");
                                m.channel.createMessageCollector({ time: 60 * 1000, max: 1, filter: (msg) => msg.author.id === member.id }).on("collect", (collMsg) => {
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
                    }));
                    collector.on("end", (_reason, r) => {
                        if (r === "time") {
                            const embed = discord_js_1.EmbedBuilder.from(m.embeds[0]).setFooter({ text: "Время для редактирования вышло" });
                            m.edit({ components: [], embeds: [embed] });
                        }
                    });
                    break;
                }
                case "raidInChnButton_transfer": {
                    const chnCol = guild.channels.cache.filter((chn) => chn.isVoiceBased() && chn.members.size > 0);
                    const chnWithMembers = chnCol.each((chn) => {
                        if (chn.isVoiceBased() && chn.type === discord_js_1.ChannelType.GuildVoice) {
                            return chn;
                        }
                        else {
                            return undefined;
                        }
                    });
                    const membersCollection = [];
                    chnWithMembers.forEach((chns) => {
                        if (chns.type === discord_js_1.ChannelType.GuildVoice) {
                            chns.members.forEach((memb) => membersCollection.push(memb));
                        }
                    });
                    const raidChns = guild.channels.cache.filter((chn) => chn.parentId === ids_1.ids.raidChnCategoryId && chn.type === discord_js_1.ChannelType.GuildVoice && chn.name.includes("Raid Room"));
                    const freeRaidVC = raidChns.find((chn) => chn.type === discord_js_1.ChannelType.GuildVoice && chn.members.has(raidData.creator)) ||
                        raidChns.find((chn) => chn.type === discord_js_1.ChannelType.GuildVoice && chn.userLimit > chn.members.size);
                    const movedUsers = [];
                    const alreadyMovedUsers = [];
                    yield Promise.all(raidData.joined.map((jId) => __awaiter(void 0, void 0, void 0, function* () {
                        const member = membersCollection.find((m) => m.id === jId);
                        if (member) {
                            if (!freeRaidVC || freeRaidVC.type !== discord_js_1.ChannelType.GuildVoice)
                                return console.error(`raidChntransfer err, chn is broken`, freeRaidVC);
                            if (!freeRaidVC.members.has(member.id)) {
                                yield member.voice.setChannel(freeRaidVC, `${interaction.user.username} переместил участников в рейдовый голосовой`);
                                movedUsers.push(`${member.displayName} был перемещен`);
                            }
                            else {
                                alreadyMovedUsers.push(`${member.displayName} уже в канале`);
                            }
                        }
                    })));
                    const replyEmbed = new discord_js_1.EmbedBuilder()
                        .setColor("Green")
                        .setTitle(`${movedUsers.length}/${raidData.joined.length - alreadyMovedUsers.length} пользователей перемещено`)
                        .setDescription(`${movedUsers.join("\n") + "\n" + alreadyMovedUsers.join("\n")}`);
                    interaction.followUp({ ephemeral: true, embeds: [replyEmbed] });
                    break;
                }
                case "raidInChnButton_unlock": {
                    const components = interaction.message.components[0].components;
                    const raidMsg = (0, channels_1.msgFetcher)(ids_1.ids.raidChnId, raidData.msgId);
                    let status = "закрыли";
                    function compRes(subC) {
                        return __awaiter(this, void 0, void 0, function* () {
                            if (subC) {
                                const msgComponents = components.map((component) => {
                                    if (component.type == discord_js_1.ComponentType.Button) {
                                        if (component.label === "Закрыть набор") {
                                            status = "закрыли";
                                            return discord_js_1.ButtonBuilder.from(component).setStyle(discord_js_1.ButtonStyle.Success).setLabel("Открыть набор");
                                        }
                                        else if (component.label === "Открыть набор") {
                                            status = "открыли";
                                            return discord_js_1.ButtonBuilder.from(component).setStyle(discord_js_1.ButtonStyle.Danger).setLabel("Закрыть набор");
                                        }
                                        else {
                                            return discord_js_1.ButtonBuilder.from(component);
                                        }
                                    }
                                    else {
                                        throw { name: "Found unknown button type", message: `${component.type}, ${raidData}` };
                                    }
                                });
                                return msgComponents;
                            }
                            else {
                                const msgComponents = (yield raidMsg).components[0].components.map((component) => {
                                    if (component.type === discord_js_1.ComponentType.Button) {
                                        if (component.label === "Записаться" || component.label === "Возможно буду") {
                                            return discord_js_1.ButtonBuilder.from(component).setDisabled(!component.disabled);
                                        }
                                        else {
                                            return discord_js_1.ButtonBuilder.from(component);
                                        }
                                    }
                                    else {
                                        throw { name: "Found unknown join button type", message: `${component.type}, ${raidData}` };
                                    }
                                });
                                return msgComponents;
                            }
                        });
                    }
                    (yield raidMsg).edit({
                        components: [
                            {
                                type: discord_js_1.ComponentType.ActionRow,
                                components: yield compRes(false),
                            },
                        ],
                    });
                    interaction.message.edit({
                        components: [
                            {
                                type: discord_js_1.ComponentType.ActionRow,
                                components: yield compRes(true),
                            },
                        ],
                    });
                    const resEmbed = new discord_js_1.EmbedBuilder().setColor("Green").setTitle(`Вы ${status} набор`);
                    interaction.followUp({ embeds: [resEmbed], ephemeral: true });
                    break;
                }
                case "raidInChnButton_delete": {
                    const embed = new discord_js_1.EmbedBuilder().setColor("Yellow").setTitle(`Подтвердите удаление рейда ${raidData.id}-${raidData.raid}`);
                    const components = [
                        {
                            type: discord_js_1.ComponentType.ActionRow,
                            components: [
                                new discord_js_1.ButtonBuilder().setCustomId("raidAddFunc_delete_confirm").setLabel("Подтвердить").setStyle(discord_js_1.ButtonStyle.Danger),
                                new discord_js_1.ButtonBuilder().setCustomId("raidAddFunc_delete_cancel").setLabel("Отменить").setStyle(discord_js_1.ButtonStyle.Secondary),
                            ],
                        },
                    ];
                    const msg = yield interaction.followUp({
                        ephemeral: true,
                        embeds: [embed],
                        components: components,
                    });
                    const collector = msg.createMessageComponentCollector({ time: 60 * 1000, max: 1, filter: (i) => i.user.id === interaction.user.id });
                    collector.on("collect", (col) => __awaiter(void 0, void 0, void 0, function* () {
                        var _h;
                        if (col.customId.startsWith("raidAddFunc_delete_")) {
                            if (col.customId === "raidAddFunc_delete_confirm") {
                                const destroy = yield sequelize_2.raids.destroy({ where: { id: raidData.id } });
                                if (destroy === 1) {
                                    try {
                                        yield ((_h = interaction.guild.channels.cache.get(raidData.chnId)) === null || _h === void 0 ? void 0 : _h.delete(`${interaction.user.username} удалил рейд через кнопку(!)`));
                                    }
                                    catch (e) {
                                        console.error(`Channel during raid manual delete for raidId ${raidData.id} wasn't found`);
                                        e.code !== 10008 ? console.error(e) : console.error("raidDeleteBtn unknown msg err");
                                    }
                                    try {
                                        yield (yield (0, channels_1.msgFetcher)(ids_1.ids.raidChnId, raidData.msgId)).delete();
                                    }
                                    catch (e) {
                                        console.error(`Message during raid manual delete for raidId ${raidData.id} wasn't found`);
                                        e.code !== 10008 ? console.error(e) : console.error("raidDeleteBtn unknown msg err");
                                    }
                                    const sucEmbed = new discord_js_1.EmbedBuilder().setColor("Green").setTitle(`Рейд ${raidData.id}-${raidData.raid} удален`).setTimestamp();
                                    col.update({ components: [], embeds: [sucEmbed] });
                                }
                                else {
                                    console.error(`Error during delete raid ${raidData.id}`, destroy, raidData);
                                    const errEmbed = new discord_js_1.EmbedBuilder()
                                        .setColor("DarkGreen")
                                        .setTitle(`Произошла ошибка во время удаления`)
                                        .setDescription(`Было удалено ${destroy} рейдов`);
                                    col.update({ embeds: [errEmbed], components: [] });
                                }
                            }
                            else if (col.customId === "raidAddFunc_delete_cancel") {
                                const canceledEmbed = new discord_js_1.EmbedBuilder().setColor("Grey").setTitle("Удаление рейда отменено");
                                col.update({ components: [], embeds: [canceledEmbed] });
                            }
                        }
                    }));
                    break;
                }
            }
        }
    }),
};
