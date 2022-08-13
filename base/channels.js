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
exports.chnFetcher = exports.msgFetcher = exports.clan = void 0;
const discord_js_1 = require("discord.js");
const __1 = require("..");
const ids_1 = require("./ids");
exports.clan = {
    joinRequest: { chnId: "696622137028640839", joinRequestGuideMessageId: "698597909825847446" },
    registerChnId: "749679238591938661",
    questionChnId: "694119710677008425",
};
function msgFetcher(unresChn, msgId) {
    return __awaiter(this, void 0, void 0, function* () {
        const chn = chnFetcher(unresChn).messages;
        const msg = chn.cache.get(msgId);
        if (!msg) {
            const fetchedMsg = yield chn.fetch(msgId);
            if (!fetchedMsg) {
                throw { name: "msgFetcher Message not found", message: `${unresChn}, ${msgId}, ${chn.cache.size}` };
            }
            else {
                return fetchedMsg;
            }
        }
        else {
            return msg;
        }
    });
}
exports.msgFetcher = msgFetcher;
function chnFetcher(chn) {
    var _a, _b;
    if (typeof chn === "string") {
        if (!__1.BotClient)
            console.error(`chnFetcher bot client error`);
        const basedChannel = (_a = __1.BotClient.guilds.cache.get(ids_1.guildId)) === null || _a === void 0 ? void 0 : _a.channels.cache.get(chn);
        if (basedChannel && basedChannel.isTextBased() && basedChannel.type === discord_js_1.ChannelType.GuildText) {
            return basedChannel;
        }
        else {
            throw { name: "Произошла ошибка. Попробуйте снова", chn: `${chn}, ${basedChannel}, ${(_b = __1.BotClient.user) === null || _b === void 0 ? void 0 : _b.username}`, code: 1 };
        }
    }
    else {
        if (chn.isTextBased() && chn.type === discord_js_1.ChannelType.GuildText) {
            return chn;
        }
        else {
            throw { name: "Произошла ошибка. Попробуйте снова", chn: `${chn}, ${chn.name}`, code: 2 };
        }
    }
}
exports.chnFetcher = chnFetcher;
