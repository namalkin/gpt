const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = process.env.COURSE_URL || 'http://course:8080';
  try {
    await page.goto(base);
    await page.locator('.module-card').first().waitFor();
    assert.equal(await page.locator('.module-card').count(), 6);
    const manifest = await page.evaluate(async () => (await fetch('/api/course')).json());
    assert.equal(manifest.lessons.length, 24);
    await page.screenshot({path: '/app/artifacts/home-desktop.png', fullPage: true});
    for (const lesson of manifest.lessons) {
      await page.goto(`${base}/#lesson/${lesson.id}`);
      await page.locator('article h1').waitFor();
      assert.ok((await page.locator('article').innerText()).length > 1200, lesson.id);
      assert.equal(await page.locator('article h1').count(), 1);
      assert.ok(await page.locator('article h2').count() > 0);
    }
    await page.goto(`${base}/#lesson/start`);
    await page.locator('#complete').waitFor();
    await page.locator('#complete').click();
    await page.reload();
    await page.locator('#complete').waitFor();
    assert.match(await page.locator('#complete').innerText(), /Освоен/);
    await page.locator('#search').fill('RoPE');
    assert.equal(await page.locator('#lesson-list .lesson-link').count(), 1);
    await page.locator('#search').fill('несуществующее название');
    assert.equal(await page.locator('#lesson-list .lesson-link').count(), 0);

    await page.goto(`${base}/#attention`);
    await page.locator('.formula-result').waitFor();
    assert.match(await page.locator('.formula-result').innerText(), /2\.5105/);
    await page.locator('#query').selectOption('0');
    assert.match(await page.locator('.formula-result').innerText(), /2\.0000, 0\.0000/);
    await page.locator('#causal').uncheck();
    assert.doesNotMatch(await page.locator('.formula-result').innerText(), /2\.0000, 0\.0000/);
    await page.locator('#scale').fill('0');
    assert.match(await page.locator('.formula-result').innerText(), /0\.3333, 0\.3333, 0\.3333/);

    await page.goto(`${base}/#compute`);
    await page.locator('.metric').first().waitFor();
    assert.equal(await page.locator('.metric').count(), 4);
    await page.locator('#heads').fill('7');
    await page.getByText('Ширина D должна делиться на число голов H.').waitFor();
    await page.locator('#heads').fill('8');
    assert.equal(await page.locator('.metric').count(), 4);

    await page.setViewportSize({width: 390, height: 844});
    for (const route of ['home', 'lesson/attention', 'attention', 'compute']) {
      await page.goto(`${base}/#${route}`);
      if (route.startsWith('lesson')) await page.locator('article h1').waitFor();
      else await page.locator('.container').waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({tag:el.tagName, cls:el.className, right:el.getBoundingClientRect().right})).slice(0,20)));
      await page.screenshot({path: `/app/artifacts/${route.replaceAll('/','-')}-mobile.png`, fullPage: true});
      assert.equal(overflow, false, `Mobile overflow: ${route}`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 24 lessons, navigation, persistent progress, search, attention values, calculator, mobile layouts; no JS errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
