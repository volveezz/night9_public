import openai from "../../structures/OpenAI.js";
async function translateDestinyText(sourceText) {
    if (!sourceText || sourceText.length <= 1) {
        return sourceText;
    }
    const prompt = `Translate the following text into Russian, while adhering to the context of the game "Destiny." Any game-specific terms, items, character names, locations, or other specialized vocabulary should remain in their original English form or use known translations provided in examples below. Your answer should be the translation of the text, do not answer with explanations or additional notes.

Translated dataset:
{
"Forsaken": "Отвергнутые",
"Shadowkeep": "Обитель теней",
"Beyond Light": "За гранью Света",
"The Witch Queen": "Королева-ведьма",
"Lightfall": "Конец Света",
"The Final Shape": "Финальная Форма",
"30th Anniversary Pack": "Пак 30-летия",
"Season Pass": "Сезонный пропуск",
"Crucible": "Горнило",
"Trials of Osiris": "Испытания Осириса",
"Strike": "Налет",
"Nightfall": "Сумрачный налет",
"Gambit": "Гамбит",
"Dungeon": "Подземелье",
"Shattered Throne": "Расколотый Трон",
"Pit of Heresy": "Яма Ереси",
"Prophecy": "Откровение",
"Last Wish": "Последнее Желание",
"Garden of Salvation": "Сад Спасения",
"Deep Stone Crypt": "Склеп Глубокого камня",
"Vault of Glass": "Хрустальный чертог",
"Root of Nightmares": "Источник Кошмаров",
"Crota's End": "Крах Кроты",
"Vow of the Disciple": "Клятва Послушника",
"King’s Fall": "Гибель Короля",
"Duality": "Дуальность",
"Grasp of Avarice": "Тиски алчности",
"Spire of the Watcher": "Шпиль хранителя",
"Ghosts of the Deep": "Призраки Глубин",
"The Lightblade": "Клинок Света",
"Solstice": "Солнцестояние",
"The Dawning": "Рассвет",
"Iron Banner": "Железное знамя",
"Festival of the Lost": "Фестиваль Усопших",
"Guardian Games": "Игры Стражей",
"The Immortal": "Бесмертный",
"Witherhoard": "Горстка пепла",
"Arbalest": "Арбалет",
"Gjallarhorn": "Гьяллархорн",
"Osteo Striga": "Остео Стрига",
"Xenophage": "Ксенофаг",
"Izanagi’s Burden": "Бремя Идзанаги",
"Outbreak Perfected": "Идеальная эпидемия",
"Divinity": "Божественность",
"Anarchy": "Анархия",
"The Lament": "Плач",
"Vanguard": "Авангард",
"Taken": "Одержимые",
"Vex": "Вексы",
"Shadow Legion": "Легион Теней",
"Lucent Hive": "Сияющий улей",
"Saint-14": "Сейнт-14",
"Cayde": "Кейд",
"Rhulk": "Рулк",
"Xivu Arath": "Зиву Арат",
"The Traveler": "Странник",
"Postmaster": "Почтмейстер",
"Xur": "Зур",
"Ascendant Shard": "Высший осколок",
"Ascendant Alloy": "Высший сплав",
"Enhancement Prism": "Улучшающая призма",
"Masterwork": "Абсолют",
"Player Removal": "Отключение игроков",
"Adept": "Адепт",
"Fireteam": "Боевая группа",
"Hive Rune": "Руна Улья",
"Veil Containment": "Защитная оболочка вуали",
"Veil": "Вуаль",
"Guardian Rank": "Ранг Стража",
"Developer Insights": "Комментарии разработчиков",
"Community Focus": "Сообщество в фокусе",
"Strand": "Нить",
"Hunter": "Охотник",
"Warlock": "Варлок",
"Titan": "Титан",
"European Dead Zone": "Европейская мертвая зона",
"Savathun": "Саватун",
"UPCOMING DESTINY BACKGROUND MAINTENANCE": "Предстоящее фоновое техническое обслуживание Destiny",
"Bounties": "Контракты",
"Destination": "Пункт назначения",
"TIMELINE": "Время",
"Glaive": "Глефа",
"roll": "набор перков",
"Savathûn’s Spire": "Шпиль Саватун",
"H.E.L.M.": "ШЛЕМ",
}`;
    const output = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
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