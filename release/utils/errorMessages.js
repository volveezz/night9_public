import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import UserErrors from "../enums/UserErrors.js";
import colors from "../configs/colors.js";
import { RegisterButtons } from "../enums/Buttons.js";
function errorMessages(errorType, ...rest) {
    switch (errorType) {
        case UserErrors.DB_USER_NOT_FOUND:
            const isSelf = rest[0]?.isSelf;
            return {
                embeds: isSelf === false
                    ? [
                        new EmbedBuilder()
                            .setColor(colors.error)
                            .setAuthor({
                            iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                            name: `Ошибка. Пользователь не зарегистрирован`,
                        })
                            .setDescription(`Функционал станет доступен сразу после его регистрации`),
                    ]
                    : [
                        new EmbedBuilder()
                            .setAuthor({
                            iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                            name: "Ошибка. Доступно после регистрации",
                        })
                            .setDescription("Для регистрации нажмите на кнопку ниже или введите `/init`")
                            .setColor(colors.error),
                    ],
                components: isSelf === false
                    ? []
                    : [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder()
                                    .setCustomId(RegisterButtons.register)
                                    .setLabel("Начать регистрацию")
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId(RegisterButtons.why)
                                    .setLabel("Для чего нужна регистрация")
                                    .setStyle(ButtonStyle.Secondary),
                            ],
                        },
                    ],
            };
        case UserErrors.RAID_NOT_FOUND:
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: "Ошибка. Рейд не найден",
                    })
                        .setDescription("Это критическая ошибка. Администрация была оповещена")
                        .setColor(colors.error),
                ],
            };
        case UserErrors.RAID_MISSING_PERMISSIONS:
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: "Ошибка. Недостаточно прав",
                    })
                        .setDescription("Недостаточно прав для управления рейдом. Такие права всегда есть у администрации и текущего создателя рейда")
                        .setColor(colors.error),
                ],
            };
        case UserErrors.RAID_ALREADY_JOINED:
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: "Вы уже записаны на этот рейд",
                    })
                        .setColor("DarkRed"),
                ],
            };
        case UserErrors.MEMBER_NOT_FOUND:
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: "Ошибка. Вы не были найдены на сервере",
                    })
                        .setDescription("Попробуйте позже\nЭта ошибка возникает лишь в случае вашего выхода с сервера или нестабильной работой серверов Discord")
                        .setColor(colors.error),
                ],
            };
        case UserErrors.WRONG_ID:
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: "Ошибка. Проверьте правильность введенного Id",
                    })
                        .setColor(colors.error),
                ],
            };
        case UserErrors.WRONG_HEX:
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: "Ошибка. Проверьте правильность введенного HEX-кода",
                    })
                        .setColor(colors.error),
                ],
            };
        case UserErrors.RAID_MISSING_DATA_FOR_CLEARS:
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: `Ошибка. Нет данных по завершенным вами рейдов`,
                    })
                        .setDescription(`Убедитесь в статусе регистрации или подождите несколько минут\nЗакрытые рейды проверяются только у участников клана или у пользователей, которые проявляют какой-либо актив на сервере`),
                ],
            };
        case UserErrors.RAID_NOT_ENOUGH_CLEARS:
            const userClears = rest[0];
            const raidRequirement = rest[1];
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: "Ошибка. Недостаточно закрытий рейда",
                    })
                        .setDescription(`Для записи на этот рейд необходимо ${raidRequirement} закрытий этого рейда, но у вас ${userClears}`),
                ],
            };
        case UserErrors.MISSING_PERMISSIONS:
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: `Ошибка. Недостаточно прав`,
                    }),
                ],
            };
        case UserErrors.RAID_TIME_ERROR:
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: "Ошибка. Проверьте корректность времени",
                    }),
                ],
            };
        case UserErrors.RAID_MISSING_DLC:
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.serious)
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: `Ошибка. Нет необходимого DLC`,
                    })
                        .setDescription(`Для записи на этот рейд необходимо дополнение ${rest[0]}`),
                ],
            };
        default:
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setAuthor({
                        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                        name: "Произошла критическая ошибка. Сообщите администрации",
                    }),
                ],
            };
    }
}
export { errorMessages };
