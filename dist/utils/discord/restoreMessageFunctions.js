import { client } from "../../index.js";
export async function processVexIncursionMessage(message) {
    if (message.author.id !== "1096872850255794176")
        return;
    const timestampField = message.embeds?.[0]?.fields?.find((field) => field.value.startsWith("<t:"));
    if (!timestampField)
        return;
    const regex = /<t:(\d+):R>/;
    const match = timestampField.value.match(regex);
    if (!match)
        return;
    const timeout = parseInt(match[1]) * 1000 - Date.now() + 60 * 1000 * 3;
    setTimeout(() => {
        message.delete().catch((_) => null);
    }, timeout);
}
export async function removeNewsChannelOriginalButtons() {
    const channel = await client.getTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID);
    const messages = await channel.messages.fetch({ limit: 100 });
    const messageWithButtons = messages.filter((m) => m.components?.[0]?.components?.[0]?.customId === "twitter_showOriginal" && m.createdTimestamp < client.readyTimestamp);
    for (const [_, message] of messageWithButtons) {
        await message.edit({ components: [] }).catch((_) => null);
    }
}
export async function fetchVexIncursionChannelMessages() {
    const channel = await client.getTextChannel(process.env.VEX_INCURSION_CHANNEL_ID);
    const messages = await channel.messages.fetch({ after: "1164065543767199764" });
    for (const [_, message] of messages) {
        processVexIncursionMessage(message);
    }
}
//# sourceMappingURL=restoreMessageFunctions.js.map