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
exports.default = {
    name: "purge",
    name_localizations: {
        ru: "чистка",
    },
    description: "Удаляет пачку сообщений за одну команду",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: discord_js_1.ApplicationCommandOptionType.Integer,
            name: "сообщений",
            description: "Количество сообщений для удаления",
            required: true,
            min_value: 1,
            max_value: 100,
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.User,
            name: "пользователь",
            description: "Пользователь, сообщения которого удаляем",
        },
    ],
    callback: (_client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        yield interaction.deferReply({ ephemeral: true });
        if (!interaction.channel || interaction.channel.type !== discord_js_1.ChannelType.GuildText)
            return;
        const msgs = interaction.options.getInteger("сообщений");
        const user = interaction.options.getUser("пользователь");
        if (!msgs || msgs > 100) {
            const embed = new discord_js_1.EmbedBuilder().setColor("Red").setTitle(`Параметр "сообщений" должен быть больше или равен 1 и меньше 100`);
            return interaction.editReply({ embeds: [embed] });
        }
        if (user) {
            const fetched = yield ((_a = interaction.channel) === null || _a === void 0 ? void 0 : _a.messages.fetch({ limit: msgs }).then((response) => {
                return response
                    .filter((message) => message.author.id === user.id)
                    .filter((msg) => msg.createdTimestamp > new Date().getTime() - 60 * 1000 * 60 * 24 * 14);
            }));
            interaction.channel
                .bulkDelete(fetched)
                .then((response) => {
                const embed = new discord_js_1.EmbedBuilder().setColor("Green").setTitle(`${response.size} сообщений ${user.username} были удалены`);
                interaction.editReply({ embeds: [embed] });
            })
                .catch((e) => {
                console.log(e);
                const embed = new discord_js_1.EmbedBuilder().setColor("Red").setTitle(`Error: ${e.code}`).setDescription(e.toString());
                interaction.editReply({ embeds: [embed] });
                return;
            });
        }
        else {
            const msgArray = yield interaction.channel.messages.fetch({ limit: msgs }).then((m) => {
                return m.filter((msg) => msg.createdTimestamp > new Date().getTime() - 60 * 1000 * 60 * 24 * 14);
            });
            interaction.channel
                .bulkDelete(msgArray)
                .then((response) => {
                const embed = new discord_js_1.EmbedBuilder().setColor("Green").setTitle(`${response.size} сообщений были удалены`);
                interaction.editReply({ embeds: [embed] });
                return;
            })
                .catch((e) => {
                console.log(e);
                const embed = new discord_js_1.EmbedBuilder().setColor("Red").setTitle(`Error: ${e.code}`).setDescription(e.toString());
                interaction.editReply({ embeds: [embed] });
                return;
            });
        }
    }),
};
