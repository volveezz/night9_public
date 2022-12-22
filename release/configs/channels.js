import "dotenv/config";
const devClan = {
    joinRequest: { chnId: "1007814172773449772", joinRequestGuideMessageId: "1007814328612814848" },
    questionChnId: "1007814172773449774",
};
const releaseClan = {
    joinRequest: { chnId: "696622137028640839", joinRequestGuideMessageId: "1031364561783242852" },
    questionChnId: "694119710677008425",
};
export const clan = process.env.DEV_BUILD !== "dev" ? releaseClan : devClan;
