import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { BungieTwitterAuthor } from "../../configs/BungieTwitterAuthor.js";
import { TwitterButtons } from "../../configs/Buttons.js";
import { client } from "../../index.js";
import openai from "../../structures/OpenAI.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { originalTweetData, twitterOriginalVoters } from "../persistence/dataStore.js";
let publicNewsChannel = null;
function extractImageUrl(content) {
    const imgRegex = /<img.*?src="(.*?)".*?>/i;
    const videoRegex = /<video.*?poster="(.*?)".*?>/i;
    const imgMatch = content.match(imgRegex);
    const videoMatch = content.match(videoRegex);
    if (imgMatch) {
        return imgMatch[1];
    }
    else if (videoMatch) {
        return videoMatch[1];
    }
    return null;
}
function clearText(content) {
    content = content.replace(/<br\s*\/?>/gi, "\n");
    content = content.replace(/<div class="rsshub-quote">[\s\S]*?<\/div>|<[^>]*>|&[^;]+;|https:\/\/t\.co\/\S+|https:\/\/twitter\.com\/i\/web\/status\/\S+/g, "");
    if (content.startsWith("Re "))
        content = content.slice(3);
    content = content.trim();
    return content;
}
async function generateTwitterEmbed(twitterData, author, icon) {
    if (!twitterData.content)
        return;
    const resolveAuthor = () => {
        const embed = new EmbedBuilder();
        if (author === BungieTwitterAuthor.Bungie) {
            return embed.setColor("#d3d2d0").setAuthor({
                name: "Bungie",
                iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1130624168568823899/BW5plrkw_400x400.png",
                url: twitterData.link,
            });
        }
        else if (author === BungieTwitterAuthor.BungieHelp) {
            return embed.setColor("#FFA500").setAuthor({
                name: "BungieHelp",
                iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1097538580571758612/vNe1WM28_400x400.png",
                url: twitterData.link,
            });
        }
        else if (author === BungieTwitterAuthor.DestinyTheGame) {
            return embed.setColor("#8fcdf6").setAuthor({
                name: "DestinyTheGame",
                iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1097538571142963280/1hh-HGZb_400x400.png",
                url: twitterData.link,
            });
        }
        else if (author === BungieTwitterAuthor.Destiny2Team) {
            return embed.setColor("#68EDFF").setAuthor({
                name: "Destiny2Team",
                iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1098350594575577188/zPtKbIQx.jpg",
                url: twitterData.link,
            });
        }
        return embed;
    };
    const cleanContent = clearText(twitterData.content || "");
    if (!cleanContent || cleanContent.length === 0) {
        console.error("[Error code: 1754]", twitterData);
        return null;
    }
    let components = [];
    const extractedMedia = extractImageUrl(twitterData.content || "")?.replaceAll("&amp;", "&");
    const replacedDescription = replaceTimeWithEpoch(cleanContent);
    let tranlsatedContent = null;
    try {
        const translateRequest = await translateTweet(replacedDescription);
        if (translateRequest && translateRequest.length > 1 && !translateRequest.includes("You exceeded your current quota")) {
            tranlsatedContent = translateRequest;
            components = [new ButtonBuilder().setCustomId(TwitterButtons.showOriginal).setLabel("Оригинал").setStyle(ButtonStyle.Secondary)];
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
        if (!tranlsatedContent)
            return;
        const voteRecord = { original: new Set(), translation: new Set() };
        twitterOriginalVoters.set(m.id, voteRecord);
        originalTweetData.set(m.id, cleanContent);
    });
    return;
}
async function translateTweet(sourceText) {
    const prompt = `You are Destiny 2 official news translator. You need to translate English source text below into Russian. You need to use Destiny jargon, existing weapons, activity names, etc. If you don't have translated version of anything AND it does not present in translated data below, do not translate it and leave original name.\n\nHere some data of already translated activities:\nDLCs\nForsaken: Отвергнутые\nShadowkeep: Обитель теней\nBeyond Light: За гранью Света\nThe Witch Queen: Королева-Ведьма\nLightfall: Конец Света\nThe Final Shape: Финальная Форма\n30th Anniversary Pack: Пак 30-летия\n\nActivities\nCrucible: Горнило\nTrials of Osiris: Испытания Осириса\nStrikes: Налеты\nNightfall: The Ordeal: Сумрачный налет: Побоище\nGambit: Гамбит\nDungeon: Подземель\nShattered Throne: Расколотый Трон\nPit of Heresy: Яма Ереси\nDungeon - Prophecy: Откровение\nLast Wish: Последнее Желание\nGarden of Salvation: Сад Спасения\nDeep Stone Crypt: Склеп Глубокого камня\nVault of Glass: Хрустальный чертог\nRoot of Nightmares: Источник Кошмаров\nVow of the Disciple: Клятва Послушника\nKing’s Fall: Гибель Короля\nDuality: Дуальность\nGrasp of Avarice: Тиски алчности\nSpire of the Watcher: Шпиль хранителя\nGhosts of the Deep: Призраки Глубин\n\nEvents\nSolstice: Солнцестояние\nSolstice of heroes: Солнцестояние Героев\nThe Dawning: Рассвет\nIron Banner: Железное Знамя\nFestival of the Lost: Фестиваль Усопших\nGuardian Games: Игры Стражей\n\nWeapons\nThe Immortal: Бесмертный\nWitherhoard: Горстка пепла\nArbalest: Арбалет\nGjallarhorn: Гьяллархорн\nOsteo Striga: Остео Стрига\nXenophage: Ксенофаг\nIzanagi’s Burden: Бремя Идзанаги\nOutbreak Perfected: Идеальная эпидемия\nDivinity: Божественность\nAnarchy: Анархия\nThe Lament: Плач\nVanguard: Авангард\nTaken: Одержимые\nVex: Вексы\nFireteam: боевая группа\nHive Rune: руна Улья\nSaint-14: Сейнт-14\nCayde: Кейд\nRhulk: Рулк\nXivu Arath: Зиву Арат\nPlayer Removal: Отключение игроков`;
    const output = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        messages: [{ role: "assistant", name: "translator", content: `${prompt}\n\nText you need to translate:\n${sourceText}` }],
    });
    console.debug(output.data.choices[0].message?.content);
    return output.data.choices[0].message?.content;
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