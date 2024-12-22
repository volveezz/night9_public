interface ImgurApiResponse<T = any> {
	data: T;
	success: boolean;
	status: number;
}

interface ImageData {
	id: string;
	title: string | null;
	description: string | null;
	datetime: number;
	type: string;
	animated: boolean;
	width: number;
	height: number;
	size: number;
	views: number;
	bandwidth: number;
	vote: string | null;
	favorite: boolean;
	nsfw: string | null;
	section: string | null;
	account_url: string | null;
	account_id: number;
	is_ad: boolean;
	in_most_viral: boolean;
	has_sound: boolean;
	tags: any[];
	ad_type: number;
	ad_url: string;
	edited: string;
	in_gallery: boolean;
	deletehash: string;
	name: string;
	link: string;
}

export { ImageData, ImgurApiResponse };
