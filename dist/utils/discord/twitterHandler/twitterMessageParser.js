import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { client } from "../../../index.js";
import openai from "../../../structures/OpenAI.js";
import { addButtonsToMessage } from "../../general/addButtonsToMessage.js";
import { originalTweetData, twitterOriginalVoters } from "../../persistence/dataStore.js";
import convertMp4ToGif from "./mp4IntoGif.js";
import { processTwitterGifFile } from "./saveGifInChannel.js";
let publicNewsChannel = null;
function extractMediaUrl(content, preferable = "image") {
    if (!content)
        return null;
    const imgRegex = /(https?:\/\/[^"]*?(?:png|jpg|jpeg|gif)(?:&amp;[^"]*)?)/g;
    const videoRegex = /(https?:\/\/[^"]*?\.mp4[^"]*)/g;
    const imgMatch = content.match(imgRegex);
    const videoMatch = content.match(videoRegex);
    if (preferable === "image") {
        return imgMatch ? imgMatch[1] || imgMatch[0] : null;
    }
    else if (preferable === "video") {
        return videoMatch ? videoMatch[1] || videoMatch[0] : null;
    }
    return null;
}
function clearText(content) {
    return content
        .replace(/&nbsp;/g, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/&gt;/gi, ">")
        .replace(/&lt;/gi, "<")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&apos;/gi, "'")
        .replace(/<div class="rsshub-quote">[\s\S]*?<\/div>|<[^>]*>|https:\/\/t\.co\/\S+|https:\/\/twitter\.com\/i\/web\/status\/\S+/g, "")
        .replace(/^Re /, "")
        .replace(/^ +/gm, (match) => "\u00A0".repeat(match.length))
        .trim();
}
async function generateTwitterEmbed(twitterData, author, icon) {
    if (!twitterData.content)
        return;
    const resolveAuthor = () => {
        const embed = new EmbedBuilder();
        switch (author) {
            case 2:
                return embed.setColor("#d3d2d0").setAuthor({
                    name: "Bungie",
                    iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1130624168568823899/BW5plrkw_400x400.png",
                    url: twitterData.link,
                });
            case 3:
                return embed.setColor("#FFA500").setAuthor({
                    name: "BungieHelp",
                    iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1097538580571758612/vNe1WM28_400x400.png",
                    url: twitterData.link,
                });
            case 1:
                return embed.setColor("#8fcdf6").setAuthor({
                    name: "DestinyTheGame",
                    iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1097538571142963280/1hh-HGZb_400x400.png",
                    url: twitterData.link,
                });
            case 4:
                return embed.setColor("#68EDFF").setAuthor({
                    name: "Destiny2Team",
                    iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1098350594575577188/zPtKbIQx.jpg",
                    url: twitterData.link,
                });
            default:
                break;
        }
        return embed;
    };
    const cleanContent = clearText(twitterData.content);
    if (!cleanContent || cleanContent.length === 0) {
        console.error("[Error code: 1754]", twitterData);
        return null;
    }
    let components = [];
    const extractedMedia = extractMediaUrl(twitterData.content)?.replaceAll("&amp;", "&");
    const replacedDescription = replaceTimeWithEpoch(cleanContent);
    let tranlsatedContent = null;
    try {
        const translateRequest = await translateDestinyText(replacedDescription);
        if (translateRequest && translateRequest.length > 1 && !translateRequest.includes("You exceeded your current quota")) {
            tranlsatedContent = translateRequest;
            components = [new ButtonBuilder().setCustomId("twitter_showOriginal").setLabel("Оригинал").setStyle(ButtonStyle.Secondary)];
        }
        else {
            console.error("[Error code: 1966]", translateRequest);
        }
    }
    catch (error) {
        console.error("[Error code: 1967]", error);
    }
    const embed = resolveAuthor().setDescription(tranlsatedContent && tranlsatedContent.length > 1 ? tranlsatedContent : replacedDescription.length > 0 ? replacedDescription : null);
    if (extractedMedia) {
        embed.setImage(extractedMedia);
    }
    if (!publicNewsChannel)
        publicNewsChannel = await client.getAsyncTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID);
    await publicNewsChannel.send({ embeds: [embed], components: addButtonsToMessage(components) }).then((m) => {
        if (tranlsatedContent) {
            const voteRecord = { original: new Set(), translation: new Set() };
            twitterOriginalVoters.set(m.id, voteRecord);
            originalTweetData.set(m.id, cleanContent);
        }
        const videoUrl = extractMediaUrl(twitterData.content, "video")?.replaceAll("&amp;", "&");
        if (videoUrl) {
            convertVideoToGif(videoUrl, m, embed);
        }
    });
    return;
}
async function convertVideoToGif(videoUrl, message, embed) {
    const gifUrl = await convertMp4ToGif(videoUrl);
    if (!gifUrl)
        return;
    processTwitterGifFile(gifUrl, message, embed);
}
export async function translateDestinyText(sourceText) {
    const prompt = `You are an official Destiny 2 news translator. Please follow the instructions below and translate text in the 'user' role.
1. You need to translate English source text in 'user' role to Russian.
2. You need to use Destiny jargon, existing weapons, activity names, etc.
3. If you don't know how to correctly translate a word and a word is not present in the translated dataset, leave original English name.
4. If you see something like Precision Bow - it doesn't mean that a bow has high precision, but rather bow with precision frame (точной рамой).

Translated dataset:
{
    "DLC": {
        "Forsaken": "Отвергнутые",
        "Shadowkeep": "Обитель теней",
        "Beyond Light": "За гранью Света",
        "The Witch Queen": "Королева-Ведьма",
        "Lightfall": "Конец Света",
        "The Final Shape": "Финальная Форма",
        "30th Anniversary Pack": "Пак 30-летия"
    },
    "Activities": {
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
        "Vow of the Disciple": "Клятва Послушника",
        "King’s Fall": "Гибель Короля",
        "Duality": "Дуальность",
        "Grasp of Avarice": "Тиски алчности",
        "Spire of the Watcher": "Шпиль хранителя",
        "Ghosts of the Deep": "Призраки Глубин"
        "The Lightblade": "Клинок Света",
    },
    "Events": {
        "Solstice": "Солнцестояние",
        "Solstice of heroes": "Солнцестояние Героев",
        "The Dawning": "Рассвет",
        "Iron Banner": "Железное Знамя",
        "Festival of the Lost": "Фестиваль Усопших",
        "Guardian Games": "Игры Стражей"
    },
    "Weapons": {
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
	},
	"Factions/races": {
        "Vanguard": "Авангард",
        "Taken": "Одержимые",
        "Vex": "Вексы",
	},
	"Character names": {
        "Saint-14": "Сейнт-14",
        "Cayde": "Кейд",
        "Rhulk": "Рулк",
        "Xivu Arath": "Зиву Арат",
        "The Traveler": "Странник",
		"Postmaster": "Почтмейстер",
		"Xur": "Зур",
	},
	"Resources": {
        "Ascendant Shards": "Высшие осколоки",
        "Ascendant Alloy": "Высшие сплавы",
		"Enhancement Prisms": "Улучшающие призмы",
        "Masterwork": "Абсолют"
    },
	"Misc": {
		"Player Removal": "Отключение игроков",
        "Adept": "Адепт",
        "Fireteam": "боевая группа",
        "Hive Rune": "руна Улья",
		"Veil Containment": "Защитная оболочка вуали",
		"Veil": "Вуаль",
	}
}
`;
    const output = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        temperature: 0,
        top_p: 1,
        messages: [
            { role: "system", name: "prompt", content: prompt },
            { role: "user", name: "translation", content: sourceText },
        ],
    });
    let outputText = output.data.choices[0].message?.content;
    if (outputText?.startsWith("Text you need to translate")) {
        outputText = outputText.slice(outputText.indexOf("\n") + 1);
    }
    if (outputText?.startsWith("Text you need to translate")) {
        outputText = outputText.replace("Text you need to translate", "");
    }
    while (outputText && (outputText.startsWith("\n") || outputText.startsWith(":"))) {
        outputText = outputText.slice(1).trim();
    }
    return outputText;
}
function replaceTimeWithEpoch(text) {
    const dateRegex = /❖\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+)/i;
    const dateMatch = text.match(dateRegex);
    let month = 0;
    let day = 0;
    let setDate = false;
    if (dateMatch) {
        const [_, dateStr] = dateMatch;
        const dateParts = dateStr.split(" ");
        const monthStr = dateParts[0].toLowerCase();
        day = parseInt(dateParts[1], 10);
        const monthNames = [
            "january",
            "february",
            "march",
            "april",
            "may",
            "june",
            "july",
            "august",
            "september",
            "october",
            "november",
            "december",
        ];
        month = monthNames.indexOf(monthStr);
        setDate = true;
    }
    const timeRegex = /(\d{1,2})(:)?(\d{2})?\s?(AM|PM)(\s?PDT\s?\(-7\s?UTC\)|\s?PST\s?\(\d{4}\s?UTC\)|\s?PST\s?\(-7\s?UTC\)|\s?PT|\s?PDT|\s?PST\s?\(-8\s?UTC\)|\s?PST)?/gi;
    const replacement = (match, hour, colon, minute, amPm, timezone) => {
        let hourNumber = parseInt(hour, 10);
        const minuteNumber = parseInt(minute || "0", 10);
        if (amPm.toUpperCase() === "PM" && hourNumber !== 12) {
            hourNumber += 12;
        }
        else if (amPm.toUpperCase() === "AM" && hourNumber === 12) {
            hourNumber = 0;
        }
        if (timezone && timezone.includes("PST")) {
            hourNumber += 8;
        }
        else {
            hourNumber += 7;
        }
        const date = new Date();
        if (setDate) {
            date.setFullYear(date.getFullYear(), month, day);
        }
        date.setHours(hourNumber, minuteNumber, 0, 0);
        const timeSinceEpoch = Math.floor(date.getTime() / 1000);
        return setDate ? `<t:${timeSinceEpoch}>` : `<t:${timeSinceEpoch}:t>`;
    };
    return text.replace(timeRegex, replacement);
}
export { generateTwitterEmbed };
//# sourceMappingURL=twitterMessageParser.js.map