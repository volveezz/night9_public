import { client } from "../../index.js";
import { pause } from "../general/utilities.js";
import createErrorEmbed from "./createErrorEmbed.js";
export async function interactionErrorResolver({ error, interaction, retryOperation }) {
    if (retryOperation)
        await pause(200);
    if (error.deferred)
        await error.deferred;
    const { embeds, components } = createErrorEmbed(error.errorType ? { errorType: error.errorType, errorData: error.errorData } : error);
    const messageOptions = { embeds, components, ephemeral: true };
    try {
        const interactionReply = interaction.replied || interaction.deferred ? interaction.followUp(messageOptions) : interaction.reply(messageOptions);
        const username = client.getCachedMembers().get(interaction.user.id)?.displayName || interaction.user.username;
        await interactionReply.catch(async (error) => {
            if (error.code === 40060 || error.code === 10062) {
                await interaction.followUp(messageOptions);
                console.info(`\x1b[32mResolved error ${error.code} for ${username}\x1b[0m`);
                return;
            }
            console.error("[Error code: 1685] Unknown error on command reply", error);
        });
        if (error.interaction) {
            delete error.interaction;
        }
        console.trace(`[Error code: 1694] Error during execution of ${interaction.customId || interaction.commandName || interaction.name} for ${username}\n`, error);
    }
    catch (e) {
        if (!retryOperation)
            interactionErrorResolver({ error, interaction, retryOperation: true }).catch((e) => console.error("[Error code: 1695] Received error upon second run of error response"));
    }
}
//# sourceMappingURL=interactionErrorResolver.js.map