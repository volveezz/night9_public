import { createRaid } from "../commands/raid/createRaid.js";
import { RaidNames } from "../configs/Raids.js";
import { Button } from "../structures/button.js";
import convertTimeStringToNumber from "../utils/general/raidFunctions/convertTimeStringToNumber.js";
import { descriptionFormatter } from "../utils/general/utilities.js";
const ButtonCommand = new Button({
    name: "submitedRaidCreation",
    run: async ({ modalSubmit: interaction, client }) => {
        const memberPromise = client.getMember(interaction.member);
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const modalFields = interaction.fields;
        const raidNameInput = (modalFields.getTextInputValue("RaidNameField") || "").replace(/\s\s+/g, " ");
        const raidTimeInput = (modalFields.getTextInputValue("RaidTimeField") || "").replace(/\s\s+/g, " ");
        const raidDescriptionInput = (modalFields.getTextInputValue("RaidDescriptionField") || "").replace(/\s\s+/g, " ");
        const raidClearRequirementInput = +(modalFields.getTextInputValue("RaidClearRequirementField") || "0").replace(/\s\s+/g, " ") || 0;
        const raidDifficulty = findRaidDifficulty(raidNameInput);
        const validatedRaidName = validateRaidName(raidNameInput);
        const validatedRaidTime = validateRaidTime(raidTimeInput);
        const validatedRaidDescription = validateRaidDescription(raidDescriptionInput);
        const member = await memberPromise;
        await createRaid({
            interaction,
            member,
            raid: validatedRaidName,
            time: validatedRaidTime,
            description: validatedRaidDescription,
            difficulty: raidDifficulty,
            clearRequirement: raidClearRequirementInput,
            deferredReply,
        });
    },
});
function validateRaidName(input) {
    switch (input) {
        case input.match(/(se|salvation'?s? edge|edge|гс|грань|грань спасения)/i)?.input:
            return RaidNames.se;
        case input.match(/(vow|disciple|votd|вотд|клятва|послушника|кп|рулк)/i)?.input:
            return RaidNames.votd;
        case input.match(/(crota'?s?|end|ce|кк|крах|крот)/i)?.input:
            return RaidNames.ce;
        case input.match(/(deep|stone|crypt|dsc|склеп|глубокого|камня|сгк|дск)/i)?.input:
            return RaidNames.dsc;
        case input.match(/(vault|glass|vog|вог|хрустальны(й|и)|чертог|хч)/i)?.input:
            return RaidNames.vog;
        case input.match(/(garden|salvation|gos|сс|сад|сад спасения|ss)/i)?.input:
            return RaidNames.gos;
        case input.match(/(king'?s?|fall|kf|гк|гибель|корол|кинг|фолл|кф)/i)?.input:
            return RaidNames.kf;
        case input.match(/(last|wish|lw|пж|последнее|желание|ривен)/i)?.input:
            return RaidNames.lw;
        case input.match(/(root|nightmare|ron|ик|источник|кошмар|рут)/i)?.input:
            return RaidNames.ron;
        default: {
            throw { name: "Ошибка названия рейда", description: `Проверьте название рейда (${input}). Оно некорректно` };
        }
    }
}
function findRaidDifficulty(input) {
    switch (input) {
        case input.match(/(master|мастер)/i)?.input:
            return 2;
        default:
            return 1;
    }
}
function validateRaidTime(input) {
    const convertedTime = convertTimeStringToNumber(input);
    if (!convertedTime || convertedTime * 1000 <= Date.now() || convertedTime >= 2147483647 || convertedTime < 1000000000) {
        throw {
            name: "Ошибка времени",
            description: `Проверьте указанное время (${input}).\nОно либо некорректно, либо находится в прошлом`,
        };
    }
    return convertedTime;
}
function validateRaidDescription(input) {
    if (!input || input.length === 0)
        return null;
    let raidDescription = descriptionFormatter(input);
    if (raidDescription.length > 1024) {
        throw {
            name: "Ошибка описания",
            description: `Описание рейда не может превышать 1024 символов. Ваше описание равнялось ${raidDescription.length} символам`,
        };
    }
    return raidDescription;
}
export default ButtonCommand;
//# sourceMappingURL=submitedRaidCreation.js.map