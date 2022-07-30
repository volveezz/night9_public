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
const sequelize_1 = require("../handlers/sequelize");
exports.default = (client) => {
    client.on("interactionCreate", (interaction) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (interaction.type === discord_js_1.InteractionType.ApplicationCommandAutocomplete && interaction.commandName === "рейд") {
            if ((_a = interaction.memberPermissions) === null || _a === void 0 ? void 0 : _a.has("Administrator")) {
                const raidData = yield sequelize_1.raids.findAll({
                    attributes: ["id", "raid"],
                });
                interaction
                    .respond(raidData.map((data) => ({
                    name: `${data.id}-${data.raid}`,
                    value: data.id,
                })))
                    .catch((e) => {
                    if (e.code !== 10062) {
                        console.error(e);
                    }
                });
            }
            else {
                const raidData = yield sequelize_1.raids.findAll({
                    where: { creator: interaction.user.id },
                    attributes: ["id", "raid"],
                });
                interaction
                    .respond(raidData.map((data) => ({
                    name: `${data.id}-${data.raid}`,
                    value: data.id,
                })))
                    .catch((e) => {
                    if (e.code !== 10062) {
                        console.error(e);
                    }
                });
            }
        }
    }));
};
