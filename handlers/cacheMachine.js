"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ids_1 = require("../base/ids");
exports.default = (client) => {
    const guild = client.guilds.cache.get(ids_1.guildId);
    if (guild.available) {
        guild.members.fetch();
        guild.channels.fetch();
        guild.bans.fetch();
    }
    else {
        console.log(`[Guild not available]`, guild.name, guild.id);
    }
};
