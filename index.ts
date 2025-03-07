// const express = require("express");
// const cheerio = require("cheerio");
// const fetch = require("node-fetch");
// const cors = require("cors");
import express from "express";
import type { Request, Response } from "express";
import cheerio from "cheerio";
import fetch from "node-fetch";
import cors from "cors";

// Define types for our data structures
interface ComicResult {
	title: string;
	url: string;
	data: string;
}

interface Author {
	name: string;
}

interface Category {
	categoryName: string;
}

interface Chapter {
	title: string;
	urlRaw?: string;
	url: string;
	date: string;
}

interface ComicDetails {
	title: string;
	image: string;
	type: string;
	status: string;
	otherName: string;
	authors: Author[];
	dateRelease: string;
	categories: Category[];
	views: string;
	description: string;
	chapters: Chapter[];
}

interface Page {
	image: string;
}

interface Comic {
	title: string;
	urlRaw?: string;
	url: string;
}

// Define API endpoint
const apiEndpoint = "http://localhost:4000";

const app = express();
app.use(cors());

// Home route
app.get("/", (req: Request, res: Response) => {
	res.send("API WORK !");
});

// Search route
app.get("/search/:title", async (req: Request, res: Response) => {
	const title = req.params.title;
	try {
		const response = await fetch(
			`https://readcomicsonline.ru/search?query=${title}`,
		);
		const body = await response.json();

		if (body.suggestions === "") {
			res.send("Not Found");
			return;
		}
		const results: ComicResult[] = [];

		for (let i = 0; i < body.suggestions.length; i++) {
			const title = body.suggestions[i].value;
			const url = `http://localhost:4000/comic/${body.suggestions[i].data}`;
			const data = body.suggestions[i].data;
			const result: ComicResult = {
				title,
				url,
				data,
			};
			results.push(result);
		}

		res.send(results);
	} catch (error) {
		console.error("Error in /search/:title:", error);
		res.status(500).json({
			error: "Failed to fetch search results",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

// Comic details route
app.get("/comic/:title", async (req: Request, res: Response) => {
	try {
		const url = `https://readcomicsonline.ru/comic/${req.params.title}`;
		const response = await fetch(url);
		const body = await response.text();
		const $ = cheerio.load(body);

		const title = $(
			".container > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > h2:nth-child(1)",
		)
			.text()
			.trim();
		const imgSrc = $(".img-responsive").attr("src");
		const image = imgSrc ? `https:${imgSrc.trim()}` : "";
		const type = $(".dl-horizontal > dd:nth-child(2)").text().trim();
		const status = $(".dl-horizontal > dd:nth-child(4)").text().trim();
		const otherName = $(".dl-horizontal > dd:nth-child(6)").text().trim();

		const authors: Author[] = [];

		$(".dl-horizontal > dd:nth-child(8)").each((i, element) => {
			const item = $(element);
			const name = item.find("a").text();
			const author: Author = {
				name,
			};
			authors.push(author);
		});

		const dateRelease = $(".dl-horizontal > dd:nth-child(10)").text();

		const categories: Category[] = [];

		$(".dl-horizontal > dd:nth-child(12)").each((i, element) => {
			const item = $(element);
			const categoryName = item.find("a").text();
			const category: Category = {
				categoryName,
			};
			categories.push(category);
		});

		const views = $(".dl-horizontal > dd:nth-child(17)").text().trim();

		const description = $(".manga > p:nth-child(2)").text().trim();

		const chapters: Chapter[] = [];

		$(".chapters li").each((i, element) => {
			const item = $(element);
			const title = item.find("h5:nth-child(1) > a:nth-child(1)").text().trim();
			const urlRaw = item.find("h5:nth-child(1) > a:nth-child(1)").attr("href");
			const date = item
				.find("div:nth-child(2) > div:nth-child(1)")
				.text()
				.trim();
			const url = urlRaw
				? `http://localhost:4000/comic/${req.params.title}/${urlRaw.substr(urlRaw.lastIndexOf("/") + 1)}`
				: "";
			const chapter: Chapter = {
				title,
				urlRaw,
				url,
				date,
			};
			chapters.push(chapter);
		});

		const results: ComicDetails = {
			title,
			image,
			type,
			status,
			otherName,
			authors,
			dateRelease,
			categories,
			views,
			description,
			chapters,
		};

		res.send(results);
	} catch (error) {
		console.error("Error in /comic/:title:", error);
		res.status(500).json({
			error: "Failed to fetch comic details",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

// Comic chapter route
app.get("/comic/:title/:chapter", async (req: Request, res: Response) => {
	try {
		const url = `https://readcomicsonline.ru/comic/${req.params.title}/${
			req.params.chapter
		}`;
		const response = await fetch(url);
		const body = await response.text();
		const $ = cheerio.load(body);
		const pages: Page[] = [];

		$("#all img").each((i, element) => {
			const item = $(element);
			const dataSrc = item.attr("data-src");
			const image = dataSrc ? dataSrc.trim() : "";

			const page: Page = {
				image,
			};

			pages.push(page);
		});

		res.send(pages);
	} catch (error) {
		console.error("Error in /comic/:title/:chapter:", error);
		res.status(500).json({
			error: "Failed to fetch comic chapter",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

// Hot comics route
app.get("/hot", async (req: Request, res: Response) => {
	try {
		const url = "https://readcomicsonline.ru/";
		const response = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			},
			timeout: 10000, // 10 second timeout
		});

		if (response.status === 500) {
			res.status(404).json({ error: "Chapter Not Found" });
			return;
		}

		const body = await response.text();
		const $ = cheerio.load(body);
		const comics: Comic[] = [];
		$("#schedule li").each((i, element) => {
			const item = $(element);
			const title = item.find(".schedule-name").text().trim();
			const urlRaw = item.find(".schedule-name a").attr("href");
			const comic: Comic = {
				title,
				urlRaw,
				url: urlRaw
					? `${apiEndpoint}/comic/${urlRaw.substr(urlRaw.lastIndexOf("/") + 1)}`
					: "",
			};
			comics.push(comic);
		});

		res.send(comics);
	} catch (error) {
		console.error("Error in /hot:", error);
		res.status(500).json({
			error: "Failed to fetch hot comics",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

app.listen("4000", () => {
	console.log("Server is running ...");
});
