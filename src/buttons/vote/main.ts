import { VoteModal } from "../../configs/Modals.js";
import { Button } from "../../structures/button.js";
import createVoteFromParams from "./createVoteFromParams.js";

const ButtonCommand = new Button({
	name: "createVote",
	run: async ({ modalSubmit }) => {
		const fields = modalSubmit.fields;

		const question = fields.getTextInputValue(VoteModal.ModifyVoteQuestion);
		const description = fields.getTextInputValue(VoteModal.ModifyVoteDescription);
		const answers = fields.getTextInputValue(VoteModal.ModifyVoteAnswers) || "Да | Нет";
		const image = fields.getTextInputValue(VoteModal.ModifyVoteImage);

		createVoteFromParams({ interaction: modalSubmit, question, description, answers, image });
	},
});

export default ButtonCommand;
