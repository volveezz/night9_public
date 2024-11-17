export var RaidNames;
(function (RaidNames) {
    RaidNames["se"] = "se";
    RaidNames["ce"] = "ce";
    RaidNames["ron"] = "ron";
    RaidNames["kf"] = "kf";
    RaidNames["votd"] = "votd";
    RaidNames["vog"] = "vog";
    RaidNames["dsc"] = "dsc";
    RaidNames["gos"] = "gos";
    RaidNames["lw"] = "lw";
})(RaidNames || (RaidNames = {}));
export const raidSelectionOptions = [
    { name: "Грань спасения", nameLocalizations: { "en-US": "Salvation's Edge", "en-GB": "Salvation's Edge" }, value: "se" },
    { name: "Крах Кроты", nameLocalizations: { "en-US": "Crota's End", "en-GB": "Crota's End" }, value: "ce" },
    {
        name: "Источник кошмаров",
        nameLocalizations: { "en-US": "Root of Nightmares", "en-GB": "Root of Nightmares" },
        value: "ron",
    },
    {
        name: "Гибель короля",
        nameLocalizations: { "en-US": "King's Fall", "en-GB": "King's Fall" },
        value: "kf",
    },
    {
        name: "Клятва послушника",
        nameLocalizations: { "en-US": "Vow of the Disciple", "en-GB": "Vow of the Disciple" },
        value: "votd",
    },
    {
        name: "Хрустальный чертог",
        nameLocalizations: { "en-US": "Vault of Glass", "en-GB": "Vault of Glass" },
        value: "vog",
    },
    {
        name: "Склеп Глубокого камня",
        nameLocalizations: { "en-US": "Deep Stone Crypt", "en-GB": "Deep Stone Crypt" },
        value: "dsc",
    },
    {
        name: "Сад спасения",
        nameLocalizations: { "en-US": "Garden of Salvation", "en-GB": "Garden of Salvation" },
        value: "gos",
    },
    {
        name: "Последнее желание",
        nameLocalizations: { "en-US": "Last Wish", "en-GB": "Last Wish" },
        value: "lw",
    },
];
export const raidDifficultiesChoices = [
    {
        name: "Стандартный",
        nameLocalizations: { "en-US": "Standard", "en-GB": "Standard" },
        value: 1,
    },
    {
        name: "Мастер",
        nameLocalizations: { "en-US": "Master", "en-GB": "Master" },
        value: 2,
    },
];
//# sourceMappingURL=Raids.js.map