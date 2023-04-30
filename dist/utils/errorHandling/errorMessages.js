import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { RegisterButtons } from "../../configs/Buttons.js";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
function errorMessages(errorType, ...rest) {
    switch (errorType) {
        case UserErrors.DB_USER_NOT_FOUND: {
            const isSelf = rest[0]?.isSelf;
            return {
                embeds: isSelf === false
                    ? [
                        new EmbedBuilder()
                            .setColor(colors.warning)
                            .setAuthor({
                            iconURL: icons.warning,
                            name: "Ошибка. Пользователь не зарегистрирован",
                        })
                            .setDescription("Функционал станет доступен сразу после его регистрации"),
                    ]
                    : [
                        new EmbedBuilder()
                            .setAuthor({
                            iconURL: icons.error,
                            name: "Ошибка. Доступно после регистрации",
                        })
                            .setDescription("Для регистрации нажмите на кнопку ниже или введите '/init'")
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
        }
        case UserErrors.RAID_NOT_FOUND: {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: icons.error,
                        name: "Ошибка. Рейд не найден",
                    })
                        .setDescription("Рейд, скорее всего, был удален")
                        .setColor(colors.error),
                ],
            };
        }
        case UserErrors.RAID_MISSING_PERMISSIONS: {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: icons.warning,
                        name: "Ошибка. Недостаточно прав",
                    })
                        .setDescription("Права для управления рейдом есть у администрации и создателя рейда")
                        .setColor(colors.warning),
                ],
            };
        }
        case UserErrors.RAID_ALREADY_JOINED: {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: icons.notify,
                        name: "Вы уже записаны на этот рейд",
                    })
                        .setColor(colors.serious),
                ],
            };
        }
        case UserErrors.MEMBER_NOT_FOUND: {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: icons.error,
                        name: "Ошибка. Вы не были найдены на сервере",
                    })
                        .setDescription("Попробуйте позже\nЭта ошибка возникает лишь в случае вашего выхода с сервера или нестабильной работой серверов Discord")
                        .setColor(colors.error),
                ],
            };
        }
        case UserErrors.WRONG_ID: {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: icons.warning,
                        name: "Ошибка. Проверьте правильность введенного Id",
                    })
                        .setColor(colors.warning),
                ],
            };
        }
        case UserErrors.WRONG_HEX: {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                        iconURL: icons.warning,
                        name: "Ошибка. Проверьте правильность введенного HEX-кода",
                    })
                        .setColor(colors.warning),
                ],
            };
        }
        case UserErrors.RAID_MISSING_DATA_FOR_CLEARS: {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.error)
                        .setAuthor({
                        iconURL: icons.error,
                        name: "Ошибка. Нет данных по завершенным вами рейдов",
                    })
                        .setDescription("Убедитесь в статусе регистрации или подождите несколько минут\nЗакрытые рейды проверяются только у участников клана или у пользователей, которые проявляют какой-либо актив на сервере"),
                ],
            };
        }
        case UserErrors.RAID_NOT_ENOUGH_CLEARS: {
            const userClears = rest[0][0];
            const raidRequirement = rest[0][1];
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setAuthor({
                        iconURL: icons.warning,
                        name: "Ошибка. Недостаточно закрытий рейда",
                    })
                        .setDescription(`Для записи на этот рейд необходимо ${raidRequirement} закрытий этого рейда, а у вас ${userClears}`),
                ],
            };
        }
        case UserErrors.MISSING_PERMISSIONS: {
            return {
                embeds: [
                    new EmbedBuilder().setColor(colors.error).setAuthor({
                        iconURL: icons.error,
                        name: "Ошибка. Недостаточно прав",
                    }),
                ],
            };
        }
        case UserErrors.RAID_TIME_ERROR: {
            return {
                embeds: [
                    new EmbedBuilder().setColor(colors.warning).setAuthor({
                        iconURL: icons.warning,
                        name: "Ошибка. Проверьте корректность времени",
                    }),
                ],
            };
        }
        case UserErrors.RAID_MISSING_DLC: {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.warning)
                        .setAuthor({
                        iconURL: icons.warning,
                        name: "Ошибка. Нет необходимого DLC",
                    })
                        .setDescription(`Для записи на этот рейд необходимо дополнение ${rest[0]}`),
                ],
            };
        }
        case UserErrors.RAID_GUIDE_NOT_FOUND: {
            return {
                embeds: [
                    new EmbedBuilder().setColor(colors.error).setAuthor({
                        name: "Ошибка. Инструкция по этому рейду не найдена",
                        iconURL: icons.error,
                    }),
                ],
            };
        }
        default: {
            return {
                embeds: [
                    new EmbedBuilder().setColor(colors.error).setAuthor({
                        iconURL: icons.error,
                        name: "Произошла критическая ошибка. Сообщите администрации",
                    }),
                ],
            };
        }
    }
}
export { errorMessages };
