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
const colors_1 = require("../base/colors");
exports.default = {
    name: "tz",
    nameLocalizations: {
        "en-US": "timezone",
    },
    description: "Укажите свой часовой пояс",
    global: true,
    callback: (_client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        yield interaction.deferReply({ ephemeral: true });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_1.colors.default)
            .setTitle(`Выберите свой часовой пояс`)
            .setDescription(`Если не знаете свой - в описании каждого часового пояса есть текущее время по нему`);
        const tzBlank = new discord_js_1.SelectMenuBuilder()
            .setCustomId("tzEvent_selectmenu")
            .setPlaceholder("Часовой пояс не выбран")
            .addOptions([
            {
                label: "+2 — Калининград",
                description: "-1 относительно Московского времени",
                value: "2",
            },
            {
                label: "+3 — Москва",
                description: "Московское время",
                value: "3",
            },
            {
                label: "+4 — Самара",
                description: "+1 относительно Московского времени",
                value: "4",
            },
            {
                label: "+5 — Екатеринбург",
                description: "+2 относительно Московского времени",
                value: "5",
            },
            {
                label: "+6 — Омск",
                description: "+3 относительно Московского времени",
                value: "6",
            },
            {
                label: "+7 — Красноярск",
                description: "+4 относительно Московского времени",
                value: "7",
            },
            {
                label: "+8 — Иркутск",
                description: "+5 относительно Московского времени",
                value: "8",
            },
            {
                label: "+9 — Якутск",
                description: "+6 относительно Московского времени",
                value: "9",
            },
            {
                label: "+10 — Владивосток",
                description: "+7 относительно Московского времени",
                value: "10",
            },
            {
                label: "+11 — Магадан",
                description: "+8 относительно Московского времени",
                value: "11",
            },
            {
                label: "+12 — Камчатка",
                description: "+9 относительно Московского времени",
                value: "12",
            },
        ]);
        const tzTime = new Date();
        tzTime.setHours(tzTime.getHours() + 2);
        tzBlank.options.forEach((option, i) => {
            option.setDescription(`${tzTime.getHours()}:${tzTime.getMinutes()}:${tzTime.getSeconds()} - время сейчас по +${i + 2} часовому поясу`);
            tzTime.setHours(tzTime.getHours() + 1);
        });
        interaction.editReply({ embeds: [embed], components: [{ type: discord_js_1.ComponentType.ActionRow, components: [tzBlank] }] });
    }),
};
