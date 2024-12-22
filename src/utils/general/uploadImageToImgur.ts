import fetch from "node-fetch";
import { ImageData, ImgurApiResponse } from "../../interfaces/imgur.js";

const IMGUR_API_URL = "https://api.imgur.com/3/image";

export async function uploadImageToImgur(imageUrl: string): Promise<string> {
	const form = new URLSearchParams();
	form.append("image", imageUrl);

	const response = await fetch(IMGUR_API_URL, {
		method: "POST",
		body: form,
		headers: {
			Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID!}`,
		},
	});

	if (!response.ok) {
		const responseData = (await response.json()) as any;
		console.error("[Error code: 2092]", responseData?.data?.error || responseData?.data || responseData);
		throw new Error(responseData?.data?.error || "Failed to upload image to Imgur.");
	}

	const data: ImgurApiResponse<ImageData> = (await response.json()) as any;
	return data.data.link;
}
