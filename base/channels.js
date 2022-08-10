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
exports.loggers = exports.clan = exports.chnFetcher = exports.msgFetcher = void 0;
const discord_js_1 = require("discord.js");
const __1 = require("..");
const ids_1 = require("./ids");
const clan = {
    join: "696622137028640839",
    joinMessage: "698597909825847446",
    register: "749679238591938661",
    question: "694119710677008425",
};
exports.clan = clan;
const loggers = {
    init: "810427373638909987",
};
exports.loggers = loggers;
function msgFetcher(unresChn, msgId) {
    return __awaiter(this, void 0, void 0, function* () {
        const chn = chnFetcher(unresChn).messages;
        const msg = chn.cache.get(msgId);
        if (!msg) {
            const fetchedMsg = yield chn.fetch(msgId);
            if (!fetchedMsg) {
                throw { name: "Message not found", message: `${unresChn}, ${msgId}, ${msg}, ${fetchedMsg}, ${chn.cache.size}` };
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
    var _a;
    if (typeof chn === "string") {
        const basedChannel = (_a = __1.BotClient.guilds.cache.get(ids_1.guildId)) === null || _a === void 0 ? void 0 : _a.channels.cache.get(chn);
        if (basedChannel && basedChannel.isTextBased() && basedChannel.type === discord_js_1.ChannelType.GuildText) {
            return basedChannel;
        }
        else {
            throw { name: "chnFetcher error", chn: chn };
        }
    }
    else {
        if (chn.isTextBased() && chn.type === discord_js_1.ChannelType.GuildText) {
            return chn;
        }
        else {
            throw { name: "chnFetcher error", chn: chn };
        }
    }
}
exports.chnFetcher = chnFetcher;
