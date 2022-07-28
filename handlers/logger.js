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
exports.clan_logout = exports.init_register = exports.activityReporter = exports.chnSetup = void 0;
const discord_js_1 = require("discord.js");
const colors_1 = require("../base/colors");
const ids_1 = require("../base/ids");
const roles_1 = require("../base/roles");
const sequelize_1 = require("./sequelize");
const sequelize_2 = require("./sequelize");
const request_promise_native_1 = require("request-promise-native");
const pgcrIds = new Set();
var guildMemberChannel, guildChannel, messageChannel, voiceChannel, destinyClanChannel, discordBotChannel;
function chnSetup(client) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.guilds.fetch(ids_1.guildId).then((guild) => __awaiter(this, void 0, void 0, function* () {
            guildMemberChannel = yield guild.channels
                .fetch(ids_1.ids.guildUsersChn)
                .then((chn) => __awaiter(this, void 0, void 0, function* () {
                if (chn.isTextBased())
                    return chn;
            }));
            guildChannel = yield guild.channels
                .fetch(ids_1.ids.guildChn)
                .then((chn) => __awaiter(this, void 0, void 0, function* () {
                if (chn.isTextBased())
                    return chn;
            }));
            messageChannel = yield guild.channels
                .fetch(ids_1.ids.messagesChn)
                .then((chn) => __awaiter(this, void 0, void 0, function* () {
                if (chn.isTextBased())
                    return chn;
            }));
            voiceChannel = yield guild.channels
                .fetch(ids_1.ids.voiceChn)
                .then((chn) => __awaiter(this, void 0, void 0, function* () {
                if (chn.isTextBased())
                    return chn;
            }));
            destinyClanChannel = yield guild.channels
                .fetch(ids_1.ids.clanChn)
                .then((chn) => __awaiter(this, void 0, void 0, function* () {
                if (chn.isTextBased())
                    return chn;
            }));
            discordBotChannel = yield guild.channels
                .fetch(ids_1.ids.botChn)
                .then((chn) => __awaiter(this, void 0, void 0, function* () {
                if (chn.isTextBased())
                    return chn;
            }));
        }));
    });
}
exports.chnSetup = chnSetup;
function activityReporter(pgcrId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!pgcrIds.has(pgcrId)) {
            (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/Stats/PostGameCarnageReport/${pgcrId}/`, { headers: { "X-API-KEY": process.env.XAPI }, json: true })
                .then((response) => { })
                .catch((e) => console.log(`activityReporter error`, pgcrId, e.statusCode));
        }
    });
}
exports.activityReporter = activityReporter;
function init_register(state, user, rowCreated) {
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(colors_1.colors.default)
        .setAuthor({
        name: `${user.username} начал регистрацию`,
        iconURL: user.displayAvatarURL(),
    })
        .setTimestamp()
        .setFooter({ text: `Id: ${user.id}` })
        .addFields([
        { name: `State`, value: state, inline: true },
        { name: "rowCreated", value: String(rowCreated), inline: true },
    ]);
    discordBotChannel === null || discordBotChannel === void 0 ? void 0 : discordBotChannel.send({ embeds: [embed] });
}
exports.init_register = init_register;
function clan_logout(bungie_id) {
    console.log("User left clan", bungie_id);
}
exports.clan_logout = clan_logout;
exports.default = (client) => {
    const voiceUsers = new Map();
    process.on("unhandledRejection", (error) => {
        console.error("Unhandled promise rejection:", error);
    });
    process.on("uncaughtException", (error) => {
        console.error("Unhandled exception:", error);
    });
    client.on("guildMemberAdd", (member) => __awaiter(void 0, void 0, void 0, function* () {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_1.colors.default)
            .setAuthor({
            name: "Присоединился новый участник",
        })
            .setTimestamp()
            .setFooter({ text: String(`Id: ` + member.id) })
            .setDescription(`<@${member.id}> ${member.user.username}#${member.user.discriminator}`)
            .addFields([
            {
                name: "Дата создания аккаунта",
                value: String("<t:" + Math.round(member.user.createdTimestamp / 1000) + ">"),
            },
        ])
            .setThumbnail(String(member.displayAvatarURL()));
        if (member.communicationDisabledUntil !== null) {
            embed.addFields([
                {
                    name: "Тайм-аут до",
                    value: String(`<t:${Math.round(member.communicationDisabledUntilTimestamp / 1000)}>`),
                },
            ]);
        }
        guildMemberChannel.send({ embeds: [embed] }).then((m) => __awaiter(void 0, void 0, void 0, function* () {
            let data = yield sequelize_1.lost_data.findOne({
                where: { discord_id: member.id },
            });
            if (data !== null) {
                data = data.toJSON();
                const transaction = yield sequelize_1.db.transaction();
                const embed = m.embeds[0];
                try {
                    yield sequelize_2.auth_data.create({
                        discord_id: data.discord_id,
                        bungie_id: data.bungie_id,
                        displayname: data.displayname,
                        platform: data.platform || 3,
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        membership_id: data.membership_id,
                        tz: 3,
                        transaction: transaction,
                    });
                    yield sequelize_1.lost_data.destroy({
                        where: { discord_id: data.discord_id },
                        transaction: transaction,
                    });
                    embed.fields.push({
                        name: "Данные аккаунта восстановлены",
                        value: `${data.displayname} (${data.platform}/${data.bungie_id})`,
                    });
                    yield transaction.commit();
                    m.edit({ embeds: [embed] });
                }
                catch (error) {
                    yield transaction.rollback();
                    embed.fields.push({
                        name: "error",
                        value: "something really bad happened",
                    });
                    console.log(error, data, transaction);
                    m.edit({ embeds: [embed] });
                }
            }
        }));
    }));
    client.on("guildMemberRemove", (member) => {
        if (member.guild.bans.cache.has(member.id))
            return;
        const embed = new discord_js_1.EmbedBuilder()
            .setAuthor({ name: "Участник покинул сервер" })
            .setColor("Red")
            .setThumbnail(member.displayAvatarURL())
            .setTimestamp()
            .addFields([
            {
                name: "Дата присоединения к серверу",
                value: String(`<t:` + Math.round(member.joinedTimestamp / 1000) + ">"),
            },
        ])
            .setFooter({ text: String(`Id: ` + member.id) });
        if (member.roles.cache.hasAny(roles_1.roles.clanmember, roles_1.roles.noclan, roles_1.roles.kicked, roles_1.roles.joined)) {
            embed.addFields([
                {
                    name: "Основные роли",
                    value: `Роль: ${member.roles.cache.has(roles_1.roles.clanmember)
                        ? `<@&${roles_1.roles.clanmember}>`
                        : []}
					${member.roles.cache.has(roles_1.roles.noclan) ? `<@&${roles_1.roles.noclan}>` : []}
						${member.roles.cache.has(roles_1.roles.kicked) ? `<@&${roles_1.roles.kicked}>` : []}
						${member.roles.cache.has(roles_1.roles.joined) ? `<@&${roles_1.roles.joined}>` : []}`,
                },
            ]);
        }
        guildMemberChannel.send({ embeds: [embed] }).then((m) => __awaiter(void 0, void 0, void 0, function* () {
            let data = yield sequelize_2.auth_data.findOne({
                where: { discord_id: member.id },
            });
            if (data !== null) {
                data = data.toJSON();
                const transaction = yield sequelize_1.db.transaction();
                const embed = m.embeds[0];
                try {
                    yield sequelize_2.auth_data.destroy({
                        where: { discord_id: data.discord_id },
                        transaction: transaction,
                    });
                    yield sequelize_1.lost_data.create({
                        discord_id: data.discord_id,
                        bungie_id: data.bungie_id,
                        displayname: data.displayname,
                        platform: data.platform,
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        membership_id: data.membership_id,
                        transaction: transaction,
                    });
                    yield transaction.commit();
                    embed.fields.push({
                        name: "bungie",
                        value: `${data.platform}/${data.bungie_id}` || "blank",
                        inline: true,
                    }, {
                        name: "displayname",
                        value: data.displayname || "blank",
                        inline: true,
                    }, {
                        name: "membership_id",
                        value: String(data.membership_id) || "blank",
                        inline: true,
                    });
                    m.edit({ embeds: [embed] });
                }
                catch (error) {
                    yield transaction.rollback();
                    embed.fields.push({
                        name: "error",
                        value: "something really bad happened",
                    });
                    console.log(error, data, transaction);
                    m.edit({ embeds: [embed] });
                }
            }
        }));
    });
    client.on("guildMemberUpdate", (oldMember, newMember) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (oldMember.joinedTimestamp === null &&
            oldMember.nickname === null &&
            oldMember.roles.cache.size === 0)
            return;
        const embed = new discord_js_1.EmbedBuilder()
            .setAuthor({ name: "guildMemberUpdate" })
            .setColor(colors_1.colors.default)
            .setFooter({ text: String("Id: " + oldMember.id) })
            .setTimestamp();
        if (oldMember.roles !== newMember.roles) {
            const removedRoles = [], gotRoles = [];
            oldMember.roles.cache.forEach((role) => {
                !newMember.roles.cache.has(role.id)
                    ? removedRoles.push(`<@&${role.id}>`)
                    : [];
            });
            newMember.roles.cache.forEach((role) => {
                !oldMember.roles.cache.has(role.id)
                    ? gotRoles.push(`<@&${role.id}>`)
                    : [];
            });
            if (removedRoles.length > 0) {
                embed
                    .setAuthor({
                    name: `У ${newMember.displayName ||
                        newMember.nickname ||
                        newMember.user.username} ${removedRoles.length === 1
                        ? "была удалена роль"
                        : "были удалены роли"}`,
                    iconURL: String(newMember.displayAvatarURL()),
                })
                    .addFields([
                    {
                        name: removedRoles.length === 1 ? "Роль" : "Роли",
                        value: removedRoles.toString(),
                    },
                ]);
            }
            else if (gotRoles.length > 0) {
                embed
                    .setAuthor({
                    name: `${newMember.displayName ||
                        newMember.nickname ||
                        newMember.user.username} ${gotRoles.length === 1
                        ? "была выдана роль"
                        : "были выданы роли"}`,
                    iconURL: String(newMember.displayAvatarURL()),
                })
                    .addFields([
                    {
                        name: gotRoles.length === 1 ? "Роль" : "Роли",
                        value: gotRoles.toString() || "error",
                    },
                ]);
            }
        }
        if (oldMember.displayName !== newMember.displayName) {
            embed
                .setAuthor({
                name: `${newMember.displayName || newMember.nickname} обновил никнейм`,
                iconURL: String(newMember.displayAvatarURL()),
            })
                .addFields([
                { name: "До", value: `\`` + oldMember.displayName + `\`` },
                { name: "После", value: `\`` + newMember.displayName + `\`` },
            ]);
        }
        if (oldMember.communicationDisabledUntilTimestamp !==
            newMember.communicationDisabledUntilTimestamp) {
            if (oldMember.communicationDisabledUntilTimestamp === null) {
                embed
                    .setAuthor({
                    name: `${newMember.displayName} был выдан тайм-аут`,
                    iconURL: String(newMember.displayAvatarURL()),
                })
                    .setColor(colors_1.colors.default)
                    .addFields([
                    {
                        name: "Тайм-аут до",
                        value: String(`<t:${Math.round(newMember.communicationDisabledUntilTimestamp / 1000)}>`),
                    },
                ]);
            }
            else {
                embed
                    .setAuthor({
                    name: `${newMember.displayName} был снят тайм-аут`,
                    iconURL: String(newMember.displayAvatarURL()),
                })
                    .setColor(colors_1.colors.default);
            }
        }
        if (((_a = embed.data.author) === null || _a === void 0 ? void 0 : _a.name) === "guildMemberUpdate") {
            console.log(oldMember);
            console.log(newMember);
        }
        else {
            guildMemberChannel.send({ embeds: [embed] });
        }
    }));
    client.on("guildBanAdd", (member) => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        const joinedDate = Math.round(((_b = member.guild.members.cache.get(member.user.id)) === null || _b === void 0 ? void 0 : _b.joinedTimestamp) / 1000);
        const embed = new discord_js_1.EmbedBuilder()
            .setAuthor({
            name: `${member.user.username} был забанен`,
            iconURL: String(member.user.displayAvatarURL()),
        })
            .setColor("Red")
            .setFooter({ text: `Id: ${member.user.id}` })
            .setTimestamp()
            .addFields([
            {
                name: "Дата присоединения к серверу",
                value: String(isNaN(joinedDate) ? "не найдена" : `<t:${joinedDate}>`),
            },
        ]);
        yield member.fetch();
        if (member.reason !== null) {
            embed.addFields([
                {
                    name: "Причина бана",
                    value: member.reason !== null && member.reason !== undefined
                        ? member.reason.toString()
                        : "не указана",
                },
            ]);
        }
        guildMemberChannel.send({ embeds: [embed] });
    }));
    client.on("guildBanRemove", (member) => {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor("Green")
            .setAuthor({
            name: `${member.user.username} разбанен`,
            iconURL: String(member.user.displayAvatarURL()),
        })
            .setTimestamp()
            .setFooter({ text: `Id: ${member.user.id}` });
        if (member.reason != null) {
            embed.addFields([
                {
                    name: "Причина бана",
                    value: member.reason.length > 1000
                        ? "*слишком длинная причина бана*"
                        : member.reason,
                },
            ]);
        }
        guildMemberChannel.send({ embeds: [embed] });
    });
    client.on("guildUpdate", (oldGuild, newGuild) => {
        var _a;
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_1.colors.default)
            .setAuthor({
            name: "Сервер обновлен",
        })
            .setTimestamp();
        if (oldGuild.name !== newGuild.name) {
            embed.addFields([
                {
                    name: "Название сервера обновлено",
                    value: `\`${oldGuild.name}\` -> \`${newGuild.name}\``,
                },
            ]);
        }
        if (oldGuild.icon !== newGuild.icon) {
            embed.addFields([
                {
                    name: "Иконка обновлена",
                    value: String(`[До](${oldGuild.iconURL() || "https://discord.gg/"}) -> [После](${newGuild.iconURL() || "https://discord.gg/"})`),
                },
            ]);
        }
        if (oldGuild.premiumTier !== newGuild.premiumTier) {
            embed.addFields([
                {
                    name: "Статус буста сервера обновлен",
                    value: `\`${oldGuild.premiumTier}\` -> \`${newGuild.premiumTier}\``,
                },
            ]);
        }
        if (oldGuild.ownerId !== newGuild.ownerId) {
            embed.addFields([
                {
                    name: "Владелец сервера обновлен",
                    value: String(newGuild
                        .fetchOwner()
                        .then((own) => `\`` + own.displayName + `\``)),
                },
            ]);
        }
        if (((_a = embed.data.fields) === null || _a === void 0 ? void 0 : _a.length) > 0)
            guildChannel.send({ embeds: [embed] });
    });
    client.on("channelCreate", (createdChannel) => {
        var _a;
        const embed = new discord_js_1.EmbedBuilder()
            .setColor("Green")
            .setAuthor({ name: `Канал ${createdChannel.name} создан` })
            .setTimestamp()
            .setFooter({ text: `ChannelId: ${createdChannel.id}` })
            .addFields([
            {
                name: `Тип`,
                value: createdChannel.type.toString(),
                inline: true,
            },
            {
                name: "Категория",
                value: String(createdChannel.position),
                inline: true,
            },
        ]);
        if (((_a = embed.data.fields) === null || _a === void 0 ? void 0 : _a.length) > 0)
            guildChannel.send({ embeds: [embed] });
    });
    client.on("channelDelete", (deletedChannel) => {
        var _a;
        const embed = new discord_js_1.EmbedBuilder()
            .setColor("Red")
            .setAuthor({ name: `Канал удален` })
            .setTimestamp();
        if (!deletedChannel.isDMBased()) {
            embed
                .setFooter({ text: `ChannelId: ` + deletedChannel.id })
                .addFields([
                {
                    name: "Название",
                    value: deletedChannel.name.toString(),
                    inline: true,
                },
                {
                    name: "Тип",
                    value: deletedChannel.type.toString(),
                    inline: true,
                },
                {
                    name: "Создан",
                    value: `<t:${Math.round(deletedChannel.createdTimestamp / 1000)}>`,
                    inline: true,
                },
            ]);
        }
        else
            console.log(`Deleted channel found in DM`, deletedChannel);
        if (((_a = embed.data.fields) === null || _a === void 0 ? void 0 : _a.length) > 0)
            guildChannel.send({ embeds: [embed] });
    });
    client.on("inviteCreate", (invite) => {
        var _a, _b, _c;
        if (invite.inviterId === ((_a = client.user) === null || _a === void 0 ? void 0 : _a.id))
            return;
        const embed = new discord_js_1.EmbedBuilder()
            .setAuthor({
            name: `${(_b = invite.inviter) === null || _b === void 0 ? void 0 : _b.username} создал приглашение`,
            iconURL: String((_c = invite.inviter) === null || _c === void 0 ? void 0 : _c.displayAvatarURL()),
        })
            .setTimestamp()
            .setFooter({ text: `Id: ${invite.inviterId}` })
            .addFields([
            { name: `Ссылка`, value: `https://discord.gg/${invite.code}` },
            {
                name: "Использований",
                value: String(invite.maxUses
                    ? invite.uses + `/` + invite.maxUses
                    : "без ограничений"),
                inline: true,
            },
            {
                name: "Действительно до",
                value: String(`${invite.expiresTimestamp
                    ? `<t:` +
                        Math.round(invite.expiresTimestamp / 1000) +
                        `>`
                    : "бессрочно"}`),
                inline: true,
            },
            {
                name: "Приглашение в",
                value: `<#${invite.channelId}>`,
                inline: true,
            },
        ])
            .setColor(`#cd1ecf`);
        guildChannel.send({ embeds: [embed] });
    });
    client.on("inviteDelete", (invite) => {
        const embed = new discord_js_1.EmbedBuilder()
            .setAuthor({ name: `Приглашение ${invite.code} удалено` })
            .setColor("Red")
            .setTimestamp()
            .addFields([
            {
                name: "Приглашение в",
                value: `<#${invite.channelId}>`,
                inline: true,
            },
        ]);
        guildChannel.send({ embeds: [embed] });
    });
    client.on("messageDelete", (message) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (message.system ||
            ((_a = message.author) === null || _a === void 0 ? void 0 : _a.id) === ((_b = client.user) === null || _b === void 0 ? void 0 : _b.id) ||
            (((_c = message.content) === null || _c === void 0 ? void 0 : _c.length) === 0 &&
                message.attachments.size === 0 &&
                message.stickers.size === 0) ||
            message.author === null)
            return;
        const embed = new discord_js_1.EmbedBuilder()
            .setColor("DarkRed")
            .setAuthor({ name: "Сообщение удалено" })
            .setFooter({ text: `MessageId: ${message.id}` })
            .setTimestamp();
        if (message.author !== null) {
            embed.addFields([
                {
                    name: "Автор",
                    value: `<@${((_d = message.author) === null || _d === void 0 ? void 0 : _d.id) ||
                        ((_e = message.author) === null || _e === void 0 ? void 0 : _e.fetch().then((a) => a.id))}> (${((_f = message.author) === null || _f === void 0 ? void 0 : _f.id) ||
                        ((_g = message.author) === null || _g === void 0 ? void 0 : _g.fetch().then((a) => a.id))})`,
                    inline: true,
                },
                {
                    name: "Удалено в",
                    value: `<#${message.channelId}>`,
                    inline: true,
                },
            ]);
        }
        else {
            embed
                .setAuthor({ name: "Неизвестное сообщение удалено" })
                .addFields([
                { name: "Удалено в", value: `<#${message.channelId}>` },
            ]);
        }
        if (((_h = message.content) === null || _h === void 0 ? void 0 : _h.length) > 0) {
            embed.addFields([
                {
                    name: "Содержание",
                    value: `\`${((_j = message.content) === null || _j === void 0 ? void 0 : _j.length) > 1000
                        ? "слишком большое сообщение"
                        : message.content}\``,
                },
            ]);
        }
        if (message.embeds.length > 0) {
            embed.addFields([
                { name: "Embed-вложения", value: `\`${message.embeds.length}\`` },
            ]);
        }
        if (message.attachments.size !== 0) {
            const arrayAttachment = [];
            message.attachments.forEach((msgAttachment) => {
                arrayAttachment.push(msgAttachment.url);
            });
            embed.addFields([
                {
                    name: message.attachments.size === 1 ? "Вложение" : "Вложения",
                    value: arrayAttachment.join(`\n`).toString() || "blank",
                },
            ]);
        }
        if (message.stickers.size !== 0) {
            const stickerArr = [];
            message.stickers.forEach((sticker) => {
                stickerArr.push(sticker.name);
            });
            embed.addFields([
                {
                    name: stickerArr.length === 1 ? "Стикер" : "Стикеры",
                    value: stickerArr.join(`\n`).toString() || "blank",
                },
            ]);
        }
        messageChannel.send({ embeds: [embed] });
    });
    client.on("messageDeleteBulk", (message) => {
        var _a, _b, _c;
        const embed = new discord_js_1.EmbedBuilder()
            .setColor("DarkRed")
            .setAuthor({ name: "Группа сообщений удалена" })
            .setTimestamp();
        for (let i = 0; i < message.size && i < 24; i++) {
            const m = message.at(i);
            embed.addFields([
                {
                    name: `Сообщение ${(_a = m === null || m === void 0 ? void 0 : m.member) === null || _a === void 0 ? void 0 : _a.displayName} (${m === null || m === void 0 ? void 0 : m.id})`,
                    value: `${((_b = m === null || m === void 0 ? void 0 : m.content) === null || _b === void 0 ? void 0 : _b.length) > 0
                        ? `\`${((_c = m === null || m === void 0 ? void 0 : m.content) === null || _c === void 0 ? void 0 : _c.length) > 1000
                            ? "*в сообщении слишком много текста*"
                            : m === null || m === void 0 ? void 0 : m.content}\``
                        : "в сообщении нет текста"}`,
                },
            ]);
        }
        message.size > 24
            ? embed.setFooter({ text: `И ещё ${message.size - 24} сообщений` })
            : [];
        messageChannel.send({ embeds: [embed] });
    });
    client.on("messageUpdate", (oldMessage, newMessage) => {
        var _a, _b;
        if (((_a = oldMessage.content) === null || _a === void 0 ? void 0 : _a.length) <= 0 ||
            oldMessage.content === newMessage.content)
            return;
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_1.colors.default)
            .setTimestamp()
            .setAuthor({ name: "Сообщение изменено" })
            .setDescription(`<@${newMessage.author.id}> изменил сообщение в <#${newMessage.channelId}>. [Перейти к сообщению](https://discord.com/channels/${newMessage.guildId}/${newMessage.channelId}/${newMessage.id})`)
            .addFields([
            {
                name: "До",
                value: oldMessage.content === null ||
                    ((_b = oldMessage.content) === null || _b === void 0 ? void 0 : _b.length) <= 0
                    ? "не закэшированное сообщение"
                    : "`" + oldMessage.content + "`",
            },
            { name: "После", value: "`" + newMessage.content + "`" },
        ]);
        messageChannel.send({ embeds: [embed] });
    });
    client.on("roleCreate", (role) => {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_1.colors.default)
            .setAuthor({ name: "Роль была создана" })
            .setFooter({ text: "RoleId: " + role.id })
            .setTimestamp()
            .addFields([
            { name: "Название", value: role.name, inline: true },
            { name: "Цвет", value: role.hexColor, inline: true },
        ]);
        guildChannel.send({ embeds: [embed] });
    });
    client.on("roleDelete", (role) => {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_1.colors.default)
            .setTimestamp()
            .setAuthor({ name: "roleDelete" })
            .setDescription(`Была удалена роль \`${role.name}\` (${role.id})`)
            .addFields([
            {
                name: "Дата создания",
                value: String("<t:" + Math.round(role.createdAt.getTime() / 1000) + ">"),
            },
        ]);
        guildChannel.send({ embeds: [embed] });
    });
    client.on("userUpdate", (oldUser, newUser) => {
        var _a;
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_1.colors.default)
            .setAuthor({ name: "userUpdate" })
            .setFooter({ text: String("Id: " + newUser.id) })
            .setTimestamp();
        if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
            embed
                .setAuthor({
                name: `${newUser.username} обновил свой аватар`,
                iconURL: newUser.displayAvatarURL(),
            })
                .addFields([
                {
                    name: "До",
                    value: String(`[Изображение](${oldUser.displayAvatarURL()})`),
                },
                {
                    name: "После",
                    value: String(`[Изображение](${newUser.displayAvatarURL()})`),
                },
            ]);
        }
        if (((_a = embed.data.fields) === null || _a === void 0 ? void 0 : _a.length) > 0)
            guildMemberChannel.send({ embeds: [embed] });
    });
    client.on("voiceStateUpdate", (oldState, newState) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
        const embed = new discord_js_1.EmbedBuilder().setColor("Green").setTimestamp();
        if (!oldState.channelId) {
            voiceUsers.set((_a = newState.member) === null || _a === void 0 ? void 0 : _a.id, {
                joinTimestamp: new Date().getTime(),
            });
            embed
                .setAuthor({
                name: `${((_b = oldState.member) === null || _b === void 0 ? void 0 : _b.displayName) ||
                    ((_c = newState.member) === null || _c === void 0 ? void 0 : _c.displayName) ||
                    "пользователь не найден"} присоединился к голосовому каналу`,
                iconURL: ((_d = oldState.member) === null || _d === void 0 ? void 0 : _d.displayAvatarURL()) ||
                    ((_e = newState.member) === null || _e === void 0 ? void 0 : _e.displayAvatarURL()),
            })
                .setFooter({
                text: `UId: ${(_f = newState.member) === null || _f === void 0 ? void 0 : _f.id} | ChnId: ${newState.channelId}`,
            })
                .addFields([{ name: "Канал", value: `<#${newState.channelId}>` }]);
        }
        if (!newState.channelId) {
            const getTimestamp = (_h = voiceUsers.get((_g = oldState.member) === null || _g === void 0 ? void 0 : _g.id)) === null || _h === void 0 ? void 0 : _h.joinTimestamp;
            embed
                .setAuthor({
                name: `${((_j = oldState.member) === null || _j === void 0 ? void 0 : _j.displayName) ||
                    ((_k = newState.member) === null || _k === void 0 ? void 0 : _k.displayName) ||
                    "пользователь не найден"} вышел из голосового канала`,
                iconURL: ((_l = oldState.member) === null || _l === void 0 ? void 0 : _l.displayAvatarURL()) ||
                    ((_m = newState.member) === null || _m === void 0 ? void 0 : _m.displayAvatarURL()),
            })
                .setFooter({
                text: `UId: ${(_o = oldState.member) === null || _o === void 0 ? void 0 : _o.id} | ChnId: ${oldState.channelId}`,
            })
                .setColor("DarkRed")
                .addFields([
                {
                    name: "Канал",
                    value: `<#${oldState.channelId}>`,
                    inline: true,
                },
            ]);
            if (getTimestamp) {
                const difference = Math.round((new Date().getTime() - getTimestamp) / 1000);
                const hours = Math.trunc(difference / 60 / 60);
                const mins = Math.trunc(hours > 0 ? (difference - hours * 60 * 60) / 60 : difference / 60);
                const secs = difference - Math.trunc(difference / 60) * 60;
                embed.addFields([
                    {
                        name: "Времени в голосовых",
                        value: `${hours ? `${hours}ч` : ""}${(hours && mins) || (hours && secs) ? ":" : ""}${mins ? `${mins}м` : ""}${secs && mins ? ":" : ""}${secs ? `${secs}с` : ""}`,
                        inline: true,
                    },
                ]);
            }
            voiceUsers.delete((_p = oldState.member) === null || _p === void 0 ? void 0 : _p.id);
        }
        if (oldState.channelId !== null &&
            newState.channelId !== null &&
            oldState.channelId !== newState.channelId) {
            embed
                .setAuthor({
                name: `${((_q = oldState.member) === null || _q === void 0 ? void 0 : _q.displayName) ||
                    ((_r = newState.member) === null || _r === void 0 ? void 0 : _r.displayName) ||
                    "пользователь не найден"} сменил голосовой канал`,
                iconURL: ((_s = oldState.member) === null || _s === void 0 ? void 0 : _s.displayAvatarURL()) ||
                    ((_t = newState.member) === null || _t === void 0 ? void 0 : _t.displayAvatarURL()),
            })
                .setFooter({
                text: `UId: ${(_u = newState.member) === null || _u === void 0 ? void 0 : _u.id} | ChnId: ${newState.channelId}`,
            })
                .addFields([
                { name: "До", value: `<#${oldState.channelId}>`, inline: true },
                {
                    name: "После",
                    value: `<#${newState.channelId}>`,
                    inline: true,
                },
            ]);
        }
        if (((_v = embed.data.fields) === null || _v === void 0 ? void 0 : _v.length) > 0)
            voiceChannel.send({ embeds: [embed] });
    });
    client.rest.on("rateLimited", (rateLimit) => {
        console.error(rateLimit);
    });
};
