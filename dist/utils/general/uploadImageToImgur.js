import fetch from "node-fetch";
const IMGUR_API_URL = "https://api.imgur.com/3/image";
export async function uploadImageToImgur(imageUrl) {
    const form = new URLSearchParams();
    form.append("image", imageUrl);
    const response = await fetch(IMGUR_API_URL, {
        method: "POST",
        body: form,
        headers: {
            Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        },
    });
    if (!response.ok) {
        const responseData = (await response.json());
        console.error("[Error code: 2092]", responseData?.data?.error || responseData?.data || responseData);
        throw new Error(responseData?.data?.error || "Failed to upload image to Imgur.");
    }
    const data = (await response.json());
    return data.data.link;
}
//# sourceMappingURL=uploadImageToImgur.js.map