"""Deterministic browser state regressions; mocked media/HTTP, not model validation."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=str(Path('.cache/chrome/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing').resolve()), headless=True)
        page = await browser.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.route('**/api/session', lambda r: r.fulfill(json=[{'ticket':'00000000-0000-4000-8000-000000000001','id':1,'english':'the mother','category':'family','mode':'review'}]))
        await page.goto('http://localhost:5173')
        await page.wait_for_timeout(100)
        await page.get_by_role('button', name='Start practice', exact=True).click()
        await page.evaluate('''() => {
            window.pendingMedia = []; window.stopped = [];
            navigator.mediaDevices.getUserMedia = () => new Promise(resolve => {
                const id = pendingMedia.length;
                pendingMedia.push(() => resolve({getTracks: () => [{stop: () => stopped.push(id)}]}));
            });
            window.MediaRecorder = class {
                static isTypeSupported() { return true; }
                state = 'inactive'; mimeType = 'audio/webm';
                start() { this.state = 'recording'; }
                stop() { this.state = 'inactive'; setTimeout(() => this.onstop?.(), 0); }
            };
        }''')
        await page.get_by_role('button', name='Record German', exact=True).click()
        await page.get_by_role('button', name='Cancel processing', exact=True).click()
        await page.get_by_role('button', name='Record German', exact=True).click()
        # Late permission from cancelled acquisition must stop only its own stream.
        await page.evaluate('pendingMedia[0]()')
        await page.wait_for_timeout(100)
        assert await page.evaluate('JSON.stringify(stopped)') == '[0]'
        assert await page.get_by_role('button', name='Cancel processing', exact=True).is_visible()
        assert await page.get_by_role('button', name='Record German', exact=True).is_disabled()
        await page.evaluate('pendingMedia[1]()')
        await page.get_by_role('button', name='Stop & check', exact=True).wait_for()
        await page.get_by_role('link', name='Deck', exact=True).click()
        await page.wait_for_timeout(100)
        assert await page.evaluate('JSON.stringify(stopped)') == '[0,1]'
        # A late reveal response cannot inject an answer into the next session.
        print('permission regression passed', flush=True)
        release = asyncio.Event()
        async def reveal(route):
            await release.wait()
            await route.fulfill(json={'german':'STALE ANSWER','alternatives':[]})
        await page.route('**/api/reveal', reveal)
        await page.get_by_role('link', name='Practice', exact=True).first.click()
        await page.get_by_role('button', name='Start practice', exact=True).click()
        await page.get_by_role('button', name='Reveal answer').click()
        print('reveal requested', flush=True)
        await page.get_by_role('link', name='Deck', exact=True).click()
        await page.get_by_role('link', name='Practice', exact=True).first.click()
        await page.get_by_role('button', name='Start practice', exact=True).click()
        release.set()
        await page.wait_for_timeout(200)
        assert await page.get_by_text('STALE ANSWER', exact=True).count() == 0
        assert await page.get_by_role('button', name='Record German', exact=True).is_enabled()
        assert not errors, errors
        await page.screenshot(path='.cache/review-desktop.png', full_page=True)
        await page.set_viewport_size({'width':390,'height':844})
        await page.wait_for_timeout(300)
        await page.screenshot(path='.cache/review-mobile.png', full_page=True)
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        await browser.close()
        print('PASS: cancelled permission cleanup, newer recording stays busy, navigation releases tracks, stale reveal ignored; no page errors.')

asyncio.run(asyncio.wait_for(main(), timeout=60))
