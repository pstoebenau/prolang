"""Real Chrome MediaRecorder encoder, synthetic audio stream (not physical microphone)."""
import asyncio,json,base64
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path=str(Path('.cache/chrome/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing').resolve()),headless=True)
  page=await b.new_page()
  data=base64.b64encode(Path('.cache/audio/family-1.wav').read_bytes()).decode()
  result=await page.evaluate('''async data=>{
   const ctx=new AudioContext({sampleRate:48000});
   const wav=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
   const buffer=await ctx.decodeAudioData(wav.buffer);
   const dest=ctx.createMediaStreamDestination(), source=ctx.createBufferSource();
   source.buffer=buffer; source.connect(dest);
   const mime='audio/webm;codecs=opus'; const rec=new MediaRecorder(dest.stream,{mimeType:mime});
   const chunks=[]; rec.ondataavailable=e=>chunks.push(e.data);
   const done=new Promise(resolve=>rec.onstop=resolve); rec.start(250); await ctx.resume();
   const ended=new Promise(resolve=>source.onended=resolve); source.start(); await ended;
   await new Promise(r=>setTimeout(r,300)); rec.stop(); await done;
   const blob=new Blob(chunks,{type:mime}); const bytes=new Uint8Array(await blob.arrayBuffer());
   await ctx.close(); return {data:btoa(String.fromCharCode(...bytes)),mime,chunks:chunks.length,userAgent:navigator.userAgent};
  }''',data)
  Path('.cache/audio/chrome-family-1.webm').write_bytes(base64.b64decode(result.pop('data')))
  result['browserVersion']=b.version; result['input']='WebAudio buffer sourced from macOS Anna TTS; no physical microphone';
  Path('validation/results/chrome-recording.json').write_text(json.dumps(result,indent=2)); await b.close()
asyncio.run(main())
