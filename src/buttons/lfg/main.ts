import { Button } from "../../structures/button.js";
import { handleLfgModal } from "../../utils/discord/lfgSystem/handleLFG.js";
import generateLfgModal from "./modalCreation.js";

const ButtonCommand = new Button({
	name: "lfg",
	run: async ({ interaction, modalSubmit }) => {
		const subCommand = (interaction || modalSubmit).customId.split("_")[1];
		switch (subCommand) {
			case "create":
				handleLfgModal(modalSubmit);
				return;
			case "show":
				interaction.showModal(generateLfgModal());
				return;
		}
		return;
	},
});

export default ButtonCommand;
