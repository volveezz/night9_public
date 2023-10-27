import openai from "../../structures/OpenAI.js";
async function translateDestinyText(sourceText) {
    if (!sourceText || sourceText.length <= 1) {
        return sourceText;
    }
    const prompt = `Translate user text into Russian, while adhering to the context of the game Destiny

Translated dataset:
{
"Forsaken": "Отвергнутые",
"Shadowkeep": "Обитель Теней",
"Beyond Light": "За гранью Света",
"The Witch Queen": "Королева-ведьма",
"Lightfall": "Конец Света",
"The Final Shape": "Финальная Форма",
"Dreaming City": "Город Грез",
"Season Pass": "Сезонный пропуск",
"Crucible": "Горнило",
"Trials of Osiris": "Испытания Осириса",
"Strike": "Налет",
"Nightfall": "Сумрачный налет",
"Gambit": "Гамбит",
"Dungeon": "Подземелье",
"Shattered Throne": "Расколотый трон",
"Pit of Heresy": "Яма ереси",
"Prophecy": "Откровение",
"Last Wish": "Последнее желание",
"Garden of Salvation": "Сад спасения",
"Deep Stone Crypt": "Склеп Глубокого камня",
"Vault of Glass": "Хрустальный чертог",
"Root of Nightmares": "Источник кошмаров",
"Crota's End": "Крах Кроты",
"Vow of the Disciple": "Клятва послушника",
"King’s Fall": "Гибель короля",
"Duality": "Дуальность",
"Grasp of Avarice": "Тиски алчности",
"Spire of the Watcher": "Шпиль хранителя",
"Ghosts of the Deep": "Призраки Глубин",
"The Lightblade": "Клинок Света",
"Heist Battleground": "Поля сражений",
"Auto rifle": "Автомат",
"Seraph's Shield": "Щит Серафима",
"Handcannon": "Револьвер",
"Vanguard": "Авангард",
"Taken": "Одержимые",
"Vex": "Вексы",
"Xur": "Зур",
"Ascendant Shard": "Высший осколок",
"Ascendant Alloy": "Высший сплав",
"Enhancement Prism": "Улучшающая призма",
"Masterwork": "Абсолют",
"Adept": "Адепт",
"Veil Containment": "Защитная оболочка вуали",
}`;
    const output = await openai.chat.completions.create({
        model: process.env.OPENAI_GPT_MODEL,
        temperature: 0,
        top_p: 1,
        messages: [
            { role: "system", name: "prompt", content: prompt },
            { role: "user", name: "translation", content: `Translate the following text: ###\n${sourceText}\n###` },
        ],
    });
    let outputText = output.choices[0].message?.content;
    if (!outputText)
        return null;
    outputText = outputText.replace(/^Translate the following text[:\n]*/, "");
    outputText = outputText.replace(/^###/, "");
    outputText = outputText.trim();
    return outputText;
}
export default translateDestinyText;
//# sourceMappingURL=translateDestinyText.js.map