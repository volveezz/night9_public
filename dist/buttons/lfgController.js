import { LFGController } from "../structures/LFGController.js";
import { Button } from "../structures/button.js";
const ButtonCommand = new Button({
    name: "lfgController",
    run: async ({ interaction }) => {
        const deferUpdatePromise = interaction.deferUpdate();
        const { customId } = interaction;
        const lfgPart = customId.split("_").pop();
        const lfgId = parseInt(lfgPart, 10);
        if (!lfgId) {
            console.error("[Error code: 2055] Found invalid lfg Id", customId, interaction.user.id);
            await deferUpdatePromise;
            throw { errorType: "LFG_NOT_FOUND", interaction, deferred: deferUpdatePromise };
        }
        switch (true) {
            case customId.startsWith("lfgController_join"): {
                LFGController.getInstance()
                    .addUserToLFG({ userId: interaction.user.id, lfgId })
                    .catch((error) => {
                    throw { error, interaction, deferred: deferUpdatePromise };
                });
                break;
            }
            case customId.startsWith("lfgController_leave"): {
                LFGController.getInstance()
                    .removeUserFromLFG({ userId: interaction.user.id, lfgId })
                    .catch((error) => {
                    throw { error, interaction, deferred: deferUpdatePromise };
                });
                break;
            }
        }
    },
});
export default ButtonCommand;
//# sourceMappingURL=lfgController.js.map