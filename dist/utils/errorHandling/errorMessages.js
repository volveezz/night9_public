import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
function errorMessages(errorType, ...rest) {
    switch (errorType) {
        case "DB_USER_NOT_FOUND": {
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
                                    .setCustomId("initEvent_register")
                                    .setLabel("Начать регистрацию")
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId("initEvent_why")
                                    .setLabel("Для чего нужна регистрация")
                                    .setStyle(ButtonStyle.Secondary),
                            ],
                        },
                    ],
            };
        }
        case "RAID_NOT_FOUND": {
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
        case "RAID_MISSING_PERMISSIONS": {
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
        case "RAID_ALREADY_JOINED": {
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
        case "MEMBER_NOT_FOUND": {
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
        case "WRONG_ID": {
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
        case "WRONG_HEX": {
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
        case "RAID_MISSING_DATA_FOR_CLEARS": {
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
        case "RAID_NOT_ENOUGH_CLEARS": {
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
        case "MISSING_PERMISSIONS": {
            return {
                embeds: [
                    new EmbedBuilder().setColor(colors.error).setAuthor({
                        iconURL: icons.error,
                        name: "Ошибка. Недостаточно прав",
                    }),
                ],
            };
        }
        case "RAID_TIME_ERROR": {
            return {
                embeds: [
                    new EmbedBuilder().setColor(colors.warning).setAuthor({
                        iconURL: icons.warning,
                        name: "Ошибка. Проверьте корректность времени",
                    }),
                ],
            };
        }
        case "RAID_MISSING_DLC": {
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
        case "RAID_GUIDE_NOT_FOUND": {
            return {
                embeds: [
                    new EmbedBuilder().setColor(colors.error).setAuthor({
                        name: "Ошибка. Руководство по этому рейду не найдена",
                        iconURL: icons.error,
                    }),
                ],
            };
        }
        case "API_UNAVAILABLE": {
            return {
                embeds: [
                    new EmbedBuilder().setColor(colors.error).setAuthor({
                        name: "Ошибка. API игры недоступно. Попробуйте позже",
                        iconURL: icons.error,
                    }),
                ],
            };
        }
        case "CLOSED_DM": {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor(colors.error)
                        .setAuthor({ name: "Ошибка. Ваши личные сообщения закрыты", iconURL: icons.error })
                        .setDescription("Для работы некоторого функционала необходимо [открыть личные сообщения](https://support.discord.com/hc/ru/articles/217916488-%D0%91%D0%BB%D0%BE%D0%BA%D0%B8%D1%80%D0%BE%D0%B2%D0%BA%D0%B0-%D0%9D%D0%B0%D1%81%D1%82%D1%80%D0%BE%D0%B9%D0%BA%D0%B8-%D0%9A%D0%BE%D0%BD%D1%84%D0%B8%D0%B4%D0%B5%D0%BD%D1%86%D0%B8%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D1%81%D1%82%D0%B8#:~:text=%D0%92%D1%8B%D0%B1%D0%BE%D1%80%D0%BE%D1%87%D0%BD%D1%8B%D0%B9%20%D0%A1%D0%BB%D1%83%D1%85%3A%20%D0%9C%D0%B5%D1%82%D0%BE%D0%B4%20%D0%9F%D1%80%D1%8F%D0%BC%D1%8B%D1%85%20%D0%A1%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9)"),
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
//# sourceMappingURL=errorMessages.js.map