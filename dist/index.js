import cookieParser from "cookie-parser";
import "dotenv/config";
import express from "express";
import { join, resolve } from "path";
import { ExtendedClient } from "./structures/client.js";
import webHandler from "./utils/api/webHandler.js";
import calculateVoteResults from "./utils/discord/twitterHandler/twitterTranslationVotes.js";
import { forceUpdateUserActivity } from "./utils/discord/userActivityHandler.js";
import { getOAuthTokens, getOAuthUrl, getUserData, updateMetadata } from "./utils/general/linkedRoles.js";
import * as storage from "./utils/persistence/webStorage.js";
export const client = new ExtendedClient();
client.rest.on("rateLimited", (rateLimit) => {
    console.error(`Ratelimited for ${rateLimit.timeToReset} ms, route: ${rateLimit.route}${rateLimit.majorParameter ? `, parameter: ${rateLimit.majorParameter}` : ""}`);
    if (rateLimit.majorParameter) {
        console.error(rateLimit.method, rateLimit.url);
    }
});
process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);
async function handleExit(signal) {
    console.log(`Received ${signal}. Saving data...`);
    await Promise.all([forceUpdateUserActivity(), calculateVoteResults()]);
    console.log("Data saved. Exiting...");
    process.exit(0);
}
process.on("uncaughtException", (error) => {
    console.error("UncaughtException at top level", error);
});
process.on("unhandledRejection", (error) => {
    if (error.code === "ECONNRESET")
        return console.error(`[Error code: 1060] ${error.code} ${error.name}`);
    if (error.code === "EPROTO")
        return console.error(`[Error code: 1061] ${error.code} ${error.name}`);
    if (error.code === "ETIMEDOUT")
        return console.error(`[Error code: 1102] ${error.code} ${error.name}`);
    if (error.statusCode >= 400 && error.statusCode <= 599)
        return console.error(`[Error code: 1214] ${error.statusCode}`);
    if (error.code >= 400 && error.code <= 599)
        return console.error(`[Error code: 1215] ${error.code}`);
    if (error.code === 50035)
        return console.error("[Error code: 1243]", error?.rawError?.errors, error?.rawError?.error, JSON.stringify(error));
    if (error.message?.startsWith("[Error code: 1952]"))
        return console.error("[Error code: 1974] Received error from sendApiRequest");
    console.error("UnhandledRejection at top level", error.stack || error);
});
const app = express();
const port = process.env.PORT || 3000;
const __dirname = resolve();
app.use(cookieParser(process.env.COOKIE_SECRET));
app.get("/", async (req, res) => {
    if (req.query.code &&
        parseInt(req.query.code.length?.toString() || "0") > 20 &&
        req.query.state &&
        parseInt(req.query.state.length?.toString() || "0") > 20) {
        webHandler(req.query.code.toString(), req.query.state.toString(), res);
    }
    else
        res.status(404).end();
});
app.get("/verify", async (req, res) => {
    const { url, state } = getOAuthUrl();
    res.cookie("clientState", state, { maxAge: 1000 * 60 * 5, signed: true });
    res.redirect(url);
});
app.get("/callback", async (req, res) => {
    try {
        const code = req.query["code"];
        const discordState = req.query["state"];
        const { clientState } = req.signedCookies;
        if (clientState !== discordState) {
            console.error("State verification failed.");
            return res.sendStatus(403);
        }
        const tokens = (await getOAuthTokens(code));
        const meData = (await getUserData(tokens));
        const userId = meData.user.id;
        await storage.storeDiscordTokens(userId, {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + tokens.expires_in * 1000,
        });
        await updateMetadata(userId);
        res.send("<script>location.replace('index.html')</script>");
    }
    catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});
app.use(express.static(join(__dirname, "public")));
app.listen(port);
//# sourceMappingURL=index.js.map