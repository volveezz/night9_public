import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, EmbedBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle, } from "discord.js";
import { chnFetcher } from "../base/channels.js";
import { colors } from "../base/colors.js";
import { ids } from "../base/ids.js";
import { statusRoles } from "../base/roles.js";
export default {
    callback: async (_client, interaction, member, _guild, _channel) => {
        const { customId } = interaction;
        const subCommand = customId.split("_");
        if (subCommand[1] === "modalBtn" && interaction instanceof ButtonInteraction) {
            const modal = new ModalBuilder().setTitle("Форма вступления в клан").setCustomId("clanJoinEvent_modal_submit");
            const userName = new TextInputBuilder()
                .setLabel("Ваш ник в игре")
                .setRequired(false)
                .setStyle(TextInputStyle.Short)
                .setCustomId("clanJoinEvent_modal_username");
            const userAge = new TextInputBuilder()
                .setLabel("Ваш возраст")
                .setStyle(TextInputStyle.Short)
                .setCustomId("clanJoinEvent_modal_age")
                .setMinLength(1)
                .setMaxLength(2)
                .setRequired(false);
            const userMicrophone = new TextInputBuilder()
                .setLabel("Есть ли у вас микрофон")
                .setStyle(TextInputStyle.Short)
                .setCustomId("clanJoinEvent_modal_microphone")
                .setPlaceholder("Есть/нет")
                .setValue("Есть")
                .setRequired(false)
                .setMaxLength(50);
            const userPower = new TextInputBuilder()
                .setLabel("Максимальный уровень силы на персонаже")
                .setStyle(TextInputStyle.Short)
                .setCustomId("clanJoinEvent_modal_power")
                .setPlaceholder("С учетом артефакта")
                .setValue("15")
                .setRequired(false);
            const additionalInfo = new TextInputBuilder()
                .setCustomId("clanJoinEvent_modal_userInfo")
                .setLabel("Любая дополнительная информация о вас для нас")
                .setPlaceholder("по желанию")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);
            const row = new ActionRowBuilder().addComponents(userName);
            const row1 = new ActionRowBuilder().addComponents(userAge);
            const row2 = new ActionRowBuilder().addComponents(userMicrophone);
            const row3 = new ActionRowBuilder().addComponents(userPower);
            const row4 = new ActionRowBuilder().addComponents(additionalInfo);
            modal.addComponents(row, row1, row2, row3, row4);
            await interaction.showModal(modal);
        }
        else if (subCommand[2] === "submit" && interaction instanceof ModalSubmitInteraction) {
            const replyEmbed = new EmbedBuilder().setColor("Green").setTitle("Вы оставили заявку на вступление в клан");
            var components;
            if (member.roles.cache.has(statusRoles.verified)) {
                replyEmbed.setDescription("Вы выполнили все условия для вступления - примите приглашение в игре и вы будете автоматически авторизованы на сервере");
            }
            else {
                replyEmbed.setDescription("Вам остается зарегистрироваться у кланового бота для вступления в клан");
                components = [
                    {
                        type: ComponentType.ActionRow,
                        components: [new ButtonBuilder().setCustomId(`initEvent_register`).setLabel("Регистрация").setStyle(ButtonStyle.Success)],
                    },
                ];
            }
            interaction.reply({ ephemeral: true, embeds: [replyEmbed], components: components });
            const loggedEmbed = new EmbedBuilder()
                .setColor(colors.default)
                .setAuthor({ name: `${member.displayName} заполнил форму на вступление в клан`, iconURL: member.displayAvatarURL() })
                .setTimestamp();
            interaction.fields.fields.forEach((c) => {
                if (!c.value)
                    return;
                loggedEmbed.addFields({ name: c.customId.split("_").pop() ?? "Заголовок не найден", value: c.value ?? "ничего не указано" });
            });
            chnFetcher(ids.clanChnId).send({ embeds: [loggedEmbed] });
        }
    },
};
