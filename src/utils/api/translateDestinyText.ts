import openai from "../../structures/OpenAI.js";

async function translateDestinyText(sourceText: string): Promise<string | null> {
	if (!sourceText || sourceText.length <= 1) {
		return sourceText;
	}

	const prompt = `Translate the following text into Russian, while adhering to the context of the game "Destiny." Any game-specific terms, items, character names, locations, or other specialized vocabulary should remain in their original English form or use known translations provided in examples below. Your answer should be the translation of the text, do not answer with explanations or additional notes.

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
"Heist Battleground": "Поля сражений",
"Auto rifle": "Автомат",
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
"Saint-14": "Сейнт-14",
"Player Removal": "Отключение игроков",
"Expected log in": "Ожидаемое время входа в игру",
"Expected end": "Ожидаемое время завершения"
}`;

	const output = await openai.chat.completions.create({
		model: process.env.OPENAI_GPT_MODEL!,
		temperature: 0,
		top_p: 1,
		messages: [
			{ role: "system", name: "prompt", content: prompt },
			{ role: "user", name: "translation", content: sourceText },
		],
	});

	let outputText = output.choices[0].message?.content;

	if (!outputText) return null;

	// Remove the "Translate the following text" prefix if it exists
	outputText = outputText.replace(/^Translate the following text[:\n]*/, "");

	// Remove any leading "###" symbols
	outputText = outputText.replace(/^###/g, "");

	// Trim any leading or trailing whitespace or newlinesw
	outputText = outputText.trim();

	return outputText;
}

export default translateDestinyText;
