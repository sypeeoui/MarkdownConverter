import { Browser } from "puppeteer-core";
import path from "upath";
import utf8 from "utf8";
import byType from "website-scraper/lib/filename-generator/by-type.js";
import { Constants } from "../Constants.js";
import { Converter } from "./Converter.js";

const { join, parse } = path;
const { encode } = utf8;

/**
 * Generates filenames for the website-scraper.
 */
export class ConverterPlugin
{
    /**
     * The converter this plugin belongs to.
     */
    private converter: Converter;

    /**
     * The name of the website to save.
     */
    private websiteName: string;

    /**
     * Initializes a new instance of the {@link ConverterPlugin `ConverterPlugin`} class.
     *
     * @param converter
     * The converter this plugin belongs to.
     *
     * @param websiteName
     * The name of the website to save.
     */
    public constructor(converter: Converter, websiteName: string)
    {
        this.converter = converter;
        this.websiteName = websiteName;
    }

    /**
     * Gets the converter this plugin belongs to.
     */
    public get Converter(): Converter
    {
        return this.converter;
    }

    /**
     * Gets the name of the website to save.
     */
    public get WebsiteName(): string
    {
        return this.websiteName;
    }

    /**
     * Applies the plugin.
     *
     * @param registerAction
     * A component for registering actions.
     */
    public apply(registerAction: (name: string, callback: (options: any) => any) => void): void
    {
        let browser: Browser;
        let occupiedFilenames: string[];
        let subdirectories: { [extension: string]: string };
        let defaultFilename: string;

        registerAction(
            "beforeStart",
            async ({ options }) =>
            {
                let browserArguments: string[] = [
                    ...this.Converter.ChromiumArgs
                ];

                try
                {
                    browser = await Constants.Puppeteer.launch({
                        ...this.Converter.BrowserOptions,
                        args: browserArguments
                    });
                }
                catch
                {
                    browser = await Constants.Puppeteer.launch({
                        ...this.Converter.BrowserOptions,
                        args: [
                            ...browserArguments,
                            "--no-sandbox"
                        ]
                    });
                }

                occupiedFilenames = [];
                subdirectories = options.subdirectories;
                defaultFilename = this.WebsiteName ?? options.defaultFilename;
            });

        registerAction(
            "afterResponse",
            async ({ response }) =>
            {
                if (response.request.href === this.Converter.URL)
                {
                    return encode(await this.Converter.Document.Render());
                }
                else
                {
                    let contentType = response.headers["content-type"];
                    let isHtml = contentType && contentType.split(";")[0] === "text/html";

                    if (isHtml)
                    {
                        let url = response.request.href;

                        let page = await browser.newPage();
                        page.setDefaultNavigationTimeout(0);
                        await page.goto(url);
                        let content = await page.content();
                        await page.close();
                        return content;
                    }
                    else
                    {
                        return response.body;
                    }
                }
            });
        registerAction(
            "generateFilename",
            ({ resource }) =>
            {
                let result: string;
                let filename: string = byType(
                    resource,
                    {
                        subdirectories,
                        defaultFilename
                    },
                    occupiedFilenames);

                if (filename === "index.html")
                {
                    result = filename = this.WebsiteName;
                }
                else
                {
                    result = join(parse(defaultFilename).name, filename);
                }

                occupiedFilenames.push(filename);
                return { filename: result };
            });
    }
}
