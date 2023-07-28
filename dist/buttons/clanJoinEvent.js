import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, } from "discord.js";
import colors from "../configs/colors.js";
import { Button } from "../structures/button.js";
let clanLogChannel = null;
const ButtonCommand = new Button({
    name: "clanJoinEvent",
    run: async ({ client, interaction: chatInteraction, modalSubmit }) => {
        const interaction = modalSubmit || chatInteraction;
        const member = client.getCachedMembers().get(interaction.user.id) || (await client.getCachedGuild().members.fetch(interaction.user.id));
        if (!member)
            throw { errorType: "MEMBER_NOT_FOUND" };
        if (chatInteraction) {
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
                .setRequired(false);
            const additionalInfo = new TextInputBuilder()
                .setCustomId("clanJoinEvent_modal_userInfo")
                .setLabel("Любая дополнительная информация о вас для нас")
                .setPlaceholder("по желанию")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);
            modal.setComponents(...[
                new ActionRowBuilder().addComponents(userName),
                new ActionRowBuilder().addComponents(userAge),
                new ActionRowBuilder().addComponents(userMicrophone),
                new ActionRowBuilder().addComponents(userPower),
                new ActionRowBuilder().addComponents(additionalInfo),
            ]);
            await chatInteraction.showModal(modal);
        }
        else if (modalSubmit) {
            const replyEmbed = new EmbedBuilder().setColor(colors.success).setTitle("Вы оставили заявку на вступление в клан");
            let components = undefined;
            if (member.roles.cache.has(process.env.VERIFIED)) {
                replyEmbed.setDescription("Вы выполнили все условия для вступления - примите приглашение в игре и вы будете автоматически авторизованы на сервере");
            }
            else {
                replyEmbed.setDescription("Вам остается зарегистрироваться у кланового бота для вступления в клан");
                components = [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            new ButtonBuilder().setCustomId("initEvent_register").setLabel("Регистрация").setStyle(ButtonStyle.Success),
                        ],
                    },
                ];
            }
            modalSubmit.reply({ ephemeral: true, embeds: [replyEmbed], components });
            const loggedEmbed = new EmbedBuilder().setColor(colors.default).setAuthor({
                name: `${member.displayName} заполнил форму на вступление в клан`,
                iconURL: member.displayAvatarURL(),
            });
            modalSubmit.fields.fields.forEach((c) => {
                if (!c.value)
                    return;
                loggedEmbed.addFields({ name: c.customId.split("_").pop() ?? "Заголовок не найден", value: c.value ?? "ничего не указано" });
            });
            if (!clanLogChannel)
                clanLogChannel =
                    client.getCachedTextChannel(process.env.CLAN_CHANNEL_ID) ||
                        (await client.getAsyncTextChannel(process.env.CLAN_CHANNEL_ID));
            await clanLogChannel.send({ embeds: [loggedEmbed] });
        }
    },
});
export default ButtonCommand;
//# sourceMappingURL=clanJoinEvent.js.map