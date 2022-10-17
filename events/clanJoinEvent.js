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
const channels_1 = require("../base/channels");
const colors_1 = require("../base/colors");
const ids_1 = require("../base/ids");
const roles_1 = require("../base/roles");
exports.default = {
    callback: (_client, interaction, member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        const { customId } = interaction;
        const subCommand = customId.split("_");
        if (subCommand[1] === "modalBtn" && interaction instanceof discord_js_1.ButtonInteraction) {
            const modal = new discord_js_1.ModalBuilder().setTitle("Форма вступления в клан").setCustomId("clanJoinEvent_modal_submit");
            const userName = new discord_js_1.TextInputBuilder()
                .setLabel("Ваш ник в игре")
                .setRequired(false)
                .setStyle(discord_js_1.TextInputStyle.Short)
                .setCustomId("clanJoinEvent_modal_username");
            const userAge = new discord_js_1.TextInputBuilder()
                .setLabel("Ваш возраст")
                .setStyle(discord_js_1.TextInputStyle.Short)
                .setCustomId("clanJoinEvent_modal_age")
                .setMinLength(1)
                .setMaxLength(2)
                .setRequired(false);
            const userMicrophone = new discord_js_1.TextInputBuilder()
                .setLabel("Есть ли у вас микрофон")
                .setStyle(discord_js_1.TextInputStyle.Short)
                .setCustomId("clanJoinEvent_modal_microphone")
                .setPlaceholder("Есть/нет")
                .setValue("Есть")
                .setRequired(false)
                .setMaxLength(50);
            const userPower = new discord_js_1.TextInputBuilder()
                .setLabel("Максимальный уровень силы на персонаже")
                .setStyle(discord_js_1.TextInputStyle.Short)
                .setCustomId("clanJoinEvent_modal_power")
                .setPlaceholder("С учетом артефакта")
                .setValue("15")
                .setRequired(false);
            const additionalInfo = new discord_js_1.TextInputBuilder()
                .setCustomId("clanJoinEvent_modal_userInfo")
                .setLabel("Любая дополнительная информация о вас для нас")
                .setPlaceholder("по желанию")
                .setStyle(discord_js_1.TextInputStyle.Paragraph)
                .setRequired(false);
            const row = new discord_js_1.ActionRowBuilder().addComponents(userName);
            const row1 = new discord_js_1.ActionRowBuilder().addComponents(userAge);
            const row2 = new discord_js_1.ActionRowBuilder().addComponents(userMicrophone);
            const row3 = new discord_js_1.ActionRowBuilder().addComponents(userPower);
            const row4 = new discord_js_1.ActionRowBuilder().addComponents(additionalInfo);
            modal.addComponents(row, row1, row2, row3, row4);
            yield interaction.showModal(modal);
        }
        else if (subCommand[2] === "submit" && interaction instanceof discord_js_1.ModalSubmitInteraction) {
            const replyEmbed = new discord_js_1.EmbedBuilder().setColor("Green").setTitle("Вы оставили заявку на вступление в клан");
            var components;
            if (member.roles.cache.has(roles_1.statusRoles.verified)) {
                replyEmbed.setDescription("Вы выполнили все условия для вступления - примите приглашение в игре и вы будете автоматически авторизованы на сервере");
            }
            else {
                replyEmbed.setDescription("Вам остается зарегистрироваться у кланового бота для вступления в клан");
                components = [
                    {
                        type: discord_js_1.ComponentType.ActionRow,
                        components: [new discord_js_1.ButtonBuilder().setCustomId(`initEvent_register`).setLabel("Регистрация").setStyle(discord_js_1.ButtonStyle.Success)],
                    },
                ];
            }
            interaction.reply({ ephemeral: true, embeds: [replyEmbed], components: components });
            const loggedEmbed = new discord_js_1.EmbedBuilder()
                .setColor(colors_1.colors.default)
                .setAuthor({ name: member.displayName + " заполнил форму на вступление в клан", iconURL: member.displayAvatarURL() })
                .setTimestamp();
            interaction.fields.fields.forEach((c) => {
                if (!c.value)
                    return;
                loggedEmbed.addFields({ name: c.customId.split("_").pop() || "Заголовок не найден", value: c.value || "ничего не указано" });
            });
            (0, channels_1.chnFetcher)(ids_1.ids.clanChnId).send({ embeds: [loggedEmbed] });
        }
    }),
};
