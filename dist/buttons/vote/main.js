import { Button } from "../../structures/button.js";
import createVoteFromParams from "./createVoteFromParams.js";
const ButtonCommand = new Button({
    name: "createVote",
    run: async ({ modalSubmit }) => {
        const fields = modalSubmit.fields;
        const question = fields.getTextInputValue("modifyVote_question");
        const description = fields.getTextInputValue("modifyVote_description");
        const answers = fields.getTextInputValue("modifyVote_answers") || "Да | Нет";
        const image = fields.getTextInputValue("modifyVote_image");
        createVoteFromParams({ interaction: modalSubmit, question, description, answers, image });
    },
});
export default ButtonCommand;
//# sourceMappingURL=main.js.map