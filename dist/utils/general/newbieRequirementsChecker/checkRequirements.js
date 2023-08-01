const minActiveScore = 1000;
const checkRequirements = (userProfile) => {
    let message = "";
    let allRequirementsMet = true;
    const userActiveScore = userProfile.profileRecords.data.activeScore;
    if (userActiveScore < minActiveScore) {
        message += `Вы не подходите по следующим требованиям: Минимальный счёт активных триумфов (минимум ${minActiveScore}, у вас: ${userActiveScore})\n`;
        allRequirementsMet = false;
    }
    return { allRequirementsMet, message };
};
export default checkRequirements;
//# sourceMappingURL=checkRequirements.js.map