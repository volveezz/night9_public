"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotClient = void 0;
const discord_js_1 = require("discord.js");
require("dotenv/config");
const path_1 = require("path");
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildBans,
        discord_js_1.GatewayIntentBits.GuildInvites,
        discord_js_1.GatewayIntentBits.GuildVoiceStates,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.DirectMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
    partials: [discord_js_1.Partials.GuildMember, discord_js_1.Partials.Channel, discord_js_1.Partials.Message, discord_js_1.Partials.User],
});
exports.BotClient = client;
client.on("ready", (client) => {
    var _a;
    console.log(`${(_a = client.user) === null || _a === void 0 ? void 0 : _a.username} is ready since ${new Date().toLocaleTimeString()}`);
    client.user.setActivity(`Restarting...`, { type: discord_js_1.ActivityType.Competing });
    const { default: init } = require("./handlers/initializer");
    setTimeout(() => init(client, (0, path_1.join)(__dirname, "commands"), (0, path_1.join)(__dirname, "features"), (0, path_1.join)(__dirname, "events")), 2000);
    setInterval(() => {
        const time = Math.trunc(client.uptime / 1000);
        const hours = Math.trunc(time / 60 / 60);
        const mins = Math.trunc(hours > 0 ? (time - hours * 60 * 60) / 60 : time / 60);
        console.log(`Client uptime: ${hours}:${mins}`);
    }, 1000 * 60 * 30);
    const date = new Date();
    date.setHours(23, 0, 0, 0);
    date.getTime() - new Date().getTime() < 0 ? date.setDate(date.getDate() + 1) : [];
    setTimeout(() => process.exit(0), date.getTime() - new Date().getTime());
});
client.login(process.env.TOKEN);
app.get("/", (req, res) => {
    var _a, _b;
    if (((_a = req.query.code) === null || _a === void 0 ? void 0 : _a.length) > 20 && ((_b = req.query.state) === null || _b === void 0 ? void 0 : _b.length) > 20) {
        const { default: webHandler } = require("./handlers/webHandler");
        webHandler(String(req.query.code), String(req.query.state), res);
    }
    else
        res.status(404).end();
});
app.get("/callback", (req, res) => res.status(200).end());
app.use(express_1.default.static((0, path_1.join)(__dirname, "public")));
app.listen(port);
