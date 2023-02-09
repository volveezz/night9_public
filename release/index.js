import express from "express";
import { ExtendedClient } from "./structures/client.js";
import { resolve, join } from "path";
import "dotenv/config";
export const client = new ExtendedClient();
await client.start();
client.rest.on("rateLimited", (rateLimit) => {
    console.error(`Ratelimited for ${rateLimit.timeToReset} ms, route: ${rateLimit.route}${rateLimit.majorParameter ? `, parameter: ${rateLimit.majorParameter}` : ""}`);
});
process.on("uncaughtException", (error, origin) => {
    console.error(`uncaughtException at top level`, origin === "uncaughtException" ? error : origin);
});
process.on("unhandledRejection", (error, a) => {
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
        return console.error(`[Error code: 1243]`, error);
    console.error(`unhandledRejection at top level`, { error });
});
const app = express();
const port = process.env.PORT || 3000;
const __dirname = resolve();
app.get("/", async (req, res) => {
    if (req.query.code &&
        parseInt(req.query.code.length?.toString() || "0") > 20 &&
        req.query.state &&
        parseInt(req.query.state.length?.toString() || "0") > 20) {
        const { default: webHandler } = await import("./functions/webHandler.js");
        webHandler(req.query.code.toString(), req.query.state.toString(), res);
    }
    else
        res.status(404).end();
});
app.use(express.static(join(__dirname, "public")));
app.listen(port);
