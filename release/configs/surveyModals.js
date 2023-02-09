import { TextInputBuilder, TextInputStyle } from "discord.js";
export const surveyModalData = [
    {
        title: "Объясните ваш вариант ответа",
        fields: [
            new TextInputBuilder()
                .setLabel("Ваша причина или предложение")
                .setStyle(TextInputStyle.Paragraph)
                .setCustomId("surveyEvent_6_3_modal_reason")
                .setRequired(false),
        ],
        customId: "surveyModal_6_3",
    },
    {
        title: "Дополните ваш ответ",
        fields: [
            new TextInputBuilder()
                .setLabel("Почему вы не пользуетесь каналом?")
                .setStyle(TextInputStyle.Paragraph)
                .setCustomId("surveyEvent_7_2_modal_whyNotUse")
                .setRequired(false),
        ],
        customId: "surveyModal_7_2",
    },
    {
        title: "Дополните ваш ответ",
        fields: [
            new TextInputBuilder()
                .setLabel("А если будет русская версия новостей?")
                .setPlaceholder("То тогда буду читать. Пускай даже если будет автоматический перевод через гугл")
                .setStyle(TextInputStyle.Paragraph)
                .setCustomId("surveyEvent_7_3_modal_ifRussian")
                .setRequired(false),
        ],
        customId: "surveyModal_7_3",
    },
    {
        title: "Объясните, почему вы не пользуетесь каналом",
        fields: [
            new TextInputBuilder()
                .setLabel("Ваша причина или предложение")
                .setPlaceholder("Нет интересной для меня информации, если бы в канале публиковали: [...], то заходил бы")
                .setStyle(TextInputStyle.Paragraph)
                .setCustomId("surveyEvent_8_2_modal_reason")
                .setRequired(false),
        ],
        customId: "surveyModal_8_2",
    },
    {
        title: "Оставьте предложение по улучшению команды",
        fields: [
            new TextInputBuilder()
                .setLabel("Ваше предложение")
                .setPlaceholder("Мне не нравится много текста, я не хочу читать столько. Лучше описывать параметры в краткой форме")
                .setStyle(TextInputStyle.Paragraph)
                .setCustomId("surveyEvent_14_9_modal_suggestment")
                .setRequired(false),
        ],
        customId: "surveyModal_14",
    },
];
