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
exports.default = (client) => __awaiter(void 0, void 0, void 0, function* () {
    client.guilds.cache.forEach((preCachedGuild) => {
        preCachedGuild
            .fetch()
            .then((guild) => __awaiter(void 0, void 0, void 0, function* () {
            const members = guild.members.fetch();
            const bans = guild.bans.fetch();
            const channels = guild.channels.fetch();
            console.log(`Working at ${guild.name} with ${(yield members).size} members, ${(yield bans).size} bans and ${(yield channels).size} channels`);
        }))
            .catch((e) => console.error(`Encountered error while fetching guild ${preCachedGuild.name}/${preCachedGuild.id}`, e));
    });
});
