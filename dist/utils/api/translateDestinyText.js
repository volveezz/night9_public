import openai from "../../structures/OpenAI.js";
async function translateDestinyText(sourceText) {
    if (!sourceText || sourceText.length <= 1) {
        return sourceText;
    }
    const prompt = "Translate user text into Russian, while adhering to the context of the game Destiny";
    const output = await openai.chat.completions.create({
        model: "ft:gpt-3.5-turbo-0613:personal::8E8iKpbg",
        temperature: 0,
        top_p: 1,
        messages: [
            { role: "system", name: "prompt", content: prompt },
            { role: "user", name: "translation", content: sourceText },
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