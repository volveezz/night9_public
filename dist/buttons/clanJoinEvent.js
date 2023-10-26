import { ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Button } from "../structures/button.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import { addModalComponents } from "../utils/general/addModalComponents.js";
let clanLogChannel = null;
const ButtonCommand = new Button({
    name: "clanJoinEvent",
    run: async ({ client, interaction: buttonInteraction, modalSubmit }) => {
        if (buttonInteraction) {
            const modal = new ModalBuilder().setTitle("Форма вступления в клан").setCustomId("clanJoinEvent_modal_submit");
            const userName = new TextInputBuilder()
                .setLabel("Ваш ник в игре")
                .setRequired(false)
                .setStyle(TextInputStyle.Short)
                .setCustomId("clanJoinEvent_modal_username")
                .setMaxLength(1024);
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
                .setPlaceholder("с учетом артефакта")
                .setRequired(false)
                .setMaxLength(128);
            const additionalInfo = new TextInputBuilder()
                .setCustomId("clanJoinEvent_modal_userInfo")
                .setLabel("Любая дополнительная информация о вас для нас")
                .setPlaceholder("по желанию")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setMaxLength(1024);
            modal.setComponents(addModalComponents(userName, userAge, userMicrophone, userPower, additionalInfo));
            await buttonInteraction.showModal(modal);
        }
        else if (modalSubmit) {
            const member = await client.getMember(modalSubmit.user.id);
            if (!member)
                throw { errorType: "MEMBER_NOT_FOUND" };
            const replyEmbed = new EmbedBuilder().setColor(colors.success).setTitle("Вы оставили заявку на вступление в клан");
            const components = [];
            if (member.roles.cache.has(process.env.VERIFIED)) {
                replyEmbed.setDescription("Вы выполнили все условия для вступления - примите приглашение в игре и вы будете автоматически авторизованы на сервере");
            }
            else {
                replyEmbed.setDescription("Для вступления в клан вам остается зарегистрироваться у кланового бота введя команду </init:1157480626979610634>");
                components.push(new ButtonBuilder().setCustomId("initEvent_register").setLabel("Регистрация").setStyle(ButtonStyle.Success));
            }
            const replyPromise = modalSubmit.reply({ embeds: [replyEmbed], components: addButtonsToMessage(components), ephemeral: true });
            await Promise.allSettled([replyPromise, logFormFilling(member, modalSubmit.fields.fields)]);
        }
    },
});
async function logFormFilling(member, fields) {
    const loggedEmbed = new EmbedBuilder().setColor(colors.deepBlue).setAuthor({
        name: `${member.displayName} заполнил форму на вступление в клан`,
        iconURL: member.displayAvatarURL(),
    });
    for (const [_, field] of fields) {
        if (!field.value)
            continue;
        loggedEmbed.addFields({ name: field.customId.split("_").pop() || "Заголовок не найден", value: field.value || "ничего не указано" });
    }
    if (!clanLogChannel)
        clanLogChannel = await client.getTextChannel(process.env.CLAN_CHANNEL_ID);
    await clanLogChannel.send({ embeds: [loggedEmbed] });
}
export default ButtonCommand;
//# sourceMappingURL=clanJoinEvent.js.map