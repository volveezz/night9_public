import { GatewayIntentBits, Client, Partials, ActivityType, DiscordAPIError } from "discord.js";
import "dotenv/config";
import { resolve, join } from "path";
import express from "express";
const app = express();
const port = process.env.PORT || 3000;
const __dirname = resolve();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.GuildMember, Partials.Channel, Partials.Message, Partials.User],
});
process.on("unhandledRejection", (error) => {
    if (error.code === "ECONNRESET")
        return console.error(`[Error code: 1060] ${error.code} ${error.name}`);
    if (error.code === "EPROTO")
        return console.error(`[Error code: 1061] ${error.code} ${error.name}`);
    if (error instanceof DiscordAPIError) {
        if (error.code === 50035) {
            console.error("[Error code: 1026] Discord embed error", error, error.message, error.requestBody.json);
        }
        else
            console.error(`[Error code: 1057] Discord API error promise rejection`, error);
    }
    else
        console.error(`[Error code: 1056] Promise rejection`, error);
});
process.on("uncaughtException", (error) => console.error("[Error code: 1055] Unhandled exception:", error));
client.on("ready", async (client) => {
    console.log(`${client.user?.username} is ready since ${new Date().toLocaleTimeString()}`);
    client.user.setActivity(`Restarting...`, { type: ActivityType.Competing });
    const { default: init } = await import("./handlers/initializer.js");
    setTimeout(() => init(client, join(__dirname, "commands"), join(__dirname, "features"), join(__dirname, "events")), 2000);
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
export { client as BotClient };
app.get("/", async (req, res) => {
    if (req.query.code?.length > 20 && req.query.state?.length > 20) {
        const { default: webHandler } = await import("./handlers/webHandler.js");
        webHandler(String(req.query.code), String(req.query.state), res);
    }
    else
        res.status(404).end();
});
app.get("/callback", (req, res) => res.status(200).end());
app.use(express.static(join(__dirname, "public")));
app.listen(port);
