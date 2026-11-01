"""Playwright smoke: real MediaRecorder bytes with synthetic fake microphone, no hardware claim."""

import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=str(
                Path(
                    ".cache/chrome/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
                ).resolve()
            ),
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                f"--use-file-for-fake-audio-capture={Path('.cache/ui-reference.wav').resolve()}",
            ],
        )
        context = await browser.new_context(
            viewport={"width": 1440, "height": 1000}, permissions=["microphone"]
        )
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto("http://localhost:3000")
        await page.get_by_role("button", name="Start practice", exact=True).click()
        await page.get_by_role("button", name="Record German", exact=True).wait_for()
        assert await page.get_by_text("Expected German", exact=True).count() == 0
        await page.screenshot(path=".cache/ui-desktop-prompt.png", full_page=True)
        await page.get_by_role("button", name="Record German", exact=True).click()
        await page.get_by_role("button", name="Stop & check", exact=True).wait_for()
        await page.wait_for_timeout(2200)
        await page.get_by_role("button", name="Stop & check", exact=True).click()
        await page.get_by_text("Pronunciation feedback", exact=True).wait_for(
            timeout=180000
        )
        await page.get_by_role("button", name="Listen to phrase", exact=True).click()
        await page.locator("audio").wait_for(state="attached", timeout=180000)
        await page.screenshot(path=".cache/ui-desktop-feedback.png", full_page=True)
        await page.get_by_role("button", name="Good", exact=True).click()
        await page.get_by_role("button", name="Record German", exact=True).wait_for()
        assert await page.get_by_text("Expected German", exact=True).count() == 0
        await page.get_by_role("link", name="Deck", exact=True).click()
        await page.get_by_role("searchbox").fill("die Mutter")
        assert (
            await page.get_by_role("link", name="Practice", exact=True).count() == 2
        )
        await page.get_by_role("link", name="Practice", exact=True).last.click()
        await page.get_by_role("button", name="Reveal answer").click()
        await page.get_by_text(
            "Pronunciation only. This does not schedule vocabulary reviews."
        ).wait_for()
        assert await page.get_by_role("button", name="Good", exact=True).count() == 0
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.wait_for_timeout(300)
        await page.screenshot(path=".cache/ui-mobile-retry.png", full_page=True)
        assert await page.evaluate(
            "document.documentElement.scrollWidth <= window.innerWidth"
        )
        await page.get_by_role("link", name="Settings", exact=True).click()
        await page.screenshot(path=".cache/ui-mobile-settings.png", full_page=True)
        assert await page.evaluate(
            "document.documentElement.scrollWidth <= window.innerWidth"
        )
        await page.get_by_role("link", name="Practice", exact=True).click()
        await page.get_by_role("button", name="Start practice", exact=True).click()
        await page.get_by_role("button", name="Record German", exact=True).wait_for()
        await page.evaluate(
            "()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError')};}"
        )
        await page.get_by_role("button", name="Record German", exact=True).click()
        await (
            page.get_by_role("alert")
            .filter(has_text="Microphone permission denied")
            .wait_for()
        )
        await page.get_by_role("button", name="Reveal answer").click()
        await page.get_by_role("button", name="Hard", exact=True).click()
        await page.get_by_role("button", name="Record German", exact=True).wait_for()
        assert await page.get_by_text("Expected German", exact=True).count() == 0
        await page.screenshot(path=".cache/ui-mobile-prompt.png", full_page=True)
        await context.close()
        await browser.close()
        assert not errors, errors
        Path(".cache/ui-results.json").write_text(
            json.dumps(
                {
                    "status": "pass",
                    "fakeMicrophone": "gTTS synthetic WAV; no physical microphone",
                    "viewports": ["1440x1000", "390x844"],
                    "pageErrors": errors,
                    "checks": [
                        "hidden answer",
                        "MediaRecorder to real assessment",
                        "reference playback control",
                        "self grade",
                        "next prompt hidden",
                        "search",
                        "retry scheduling separation",
                        "mobile overflow",
                        "mobile reveal and grade",
                        "permission denial recovery",
                    ],
                },
                indent=2,
            )
        )
        print(Path(".cache/ui-results.json").read_text())


asyncio.run(main())
