import { doesNotReject, rejects } from "assert";
import { TempDirectory } from "@manuth/temp-files";
import { createSandbox, SinonSandbox } from "sinon";
import { basename } from "upath";
import { Constants } from "../../../../Constants";
import { ISettings } from "../../../../Properties/ISettings";
import { ChromiumNotFoundException } from "../../../../System/Tasks/ChromiumNotFoundException";
import { PuppeteerTask } from "../../../../System/Tasks/PuppeteerTask";
import { ITestContext } from "../../../ITestContext";
import { TestConstants } from "../../../TestConstants";

/**
 * Registers tests for the {@link PuppeteerTask `PuppeteerTask`} class.
 *
 * @param context
 * The test-context.
 */
export function PuppeteerTaskTests(context: ITestContext<ISettings>): void
{
    suite(
        nameof(PuppeteerTask),
        () =>
        {
            let chromiumPath: string;
            let tempDir: TempDirectory;
            let sandbox: SinonSandbox;
            let task: PuppeteerTaskTest;

            /**
             * Provides an implementation of the {@link PuppeteerTask `PuppeteerTask`} for testing.
             */
            class PuppeteerTaskTest extends PuppeteerTask
            {
                /**
                 * @inheritdoc
                 */
                public get Title(): string
                {
                    return "Test";
                }

                /**
                 * @inheritdoc
                 */
                protected async ExecuteTask(): Promise<void>
                { }
            }

            suiteSetup(
                async () =>
                {
                    task = new PuppeteerTaskTest(TestConstants.Extension);
                    chromiumPath = Constants.Puppeteer.executablePath();
                });

            suiteTeardown(
                async () =>
                {
                    tempDir = new TempDirectory();
                });

            setup(
                () =>
                {
                    sandbox = createSandbox();
                    sandbox.replace(Constants.Puppeteer, "executablePath", () => tempDir.MakePath(basename(chromiumPath)));
                });

            teardown(
                () =>
                {
                    sandbox.restore();
                });

            suite(
                nameof<PuppeteerTaskTest>((task) => task.Execute),
                () =>
                {
                    test(
                        "Checking whether executing the task without puppeteer installed throws an exception…",
                        async () =>
                        {
                            await rejects(() => task.Execute(), ChromiumNotFoundException);
                        });

                    test(
                        "Checking whether no exception is thrown if puppeteer's local chromium has been installed…",
                        async () =>
                        {
                            sandbox.restore();
                            await doesNotReject(() => task.Execute());
                        });

                    test(
                        `Checking whether specifying an inexistent \`${nameof<ISettings>((s) => s.ChromiumExecutablePath)}\` throws an exception…`,
                        async () =>
                        {
                            context.Settings.ChromiumExecutablePath = "hello world";

                            await rejects(
                                () => new PuppeteerTaskTest(TestConstants.Extension).Execute(),
                                ChromiumNotFoundException);
                        });

                    test(
                        `Checking whether specifying an existent \`${nameof<ISettings>((s) => s.ChromiumExecutablePath)}\` doesn't throw an exception…`,
                        async () =>
                        {
                            context.Settings.ChromiumExecutablePath = chromiumPath;
                            await doesNotReject(() => task.Execute());
                        });
                });
        });
}
