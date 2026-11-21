const { chromium } = require('playwright');
const assert = require('node:assert/strict');

async function documentFontsReady(page) { await page.evaluate(() => document.fonts.ready); }

(async () => {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = process.env.COURSE_URL || 'http://course:8080';
  const missingMathAssets = [];
  page.on('response', response => {
    if (response.url().includes('/vendor/katex/') && response.status() >= 400) missingMathAssets.push(response.url());
  });
  // The course must render without third-party requests, including its math fonts.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === new URL(base).origin ? route.continue() : route.abort();
  });
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
      const expectedMathBlocks = (lesson.html.match(/class="language-math"/g) || []).length;
      assert.equal(await page.locator('article .math-block').count(), expectedMathBlocks, lesson.id);
      assert.equal(await page.locator('.katex-error').count(), 0, `Invalid math: ${lesson.id}`);
      assert.equal(await page.locator('article code.language-math').count(), 0, `Unrendered math: ${lesson.id}`);
      assert.ok(await page.locator('.notation-guide .katex').count() >= 8);
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

    await page.goto(`${base}/#lesson/problem`);
    await page.locator('#log-probability').waitFor();
    await page.locator('#log-probability').fill('50');
    assert.match(await page.locator('.log-output').innerText(), /0\.693/);
    await page.locator('#log-probability').fill('1');
    assert.match(await page.locator('.log-output').innerText(), /4\.605/);
    await page.locator('.notation-guide summary').click();
    await documentFontsReady(page);
    await page.screenshot({path: '/app/artifacts/formulas-desktop.png', fullPage: true});
    assert.deepEqual(missingMathAssets, []);
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
    for (const route of ['home', 'lesson/problem', 'lesson/probability', 'lesson/attention', 'attention', 'compute']) {
      await page.goto(`${base}/#${route}`);
      if (route.startsWith('lesson')) await page.locator('article h1').waitFor();
      else await page.locator('.container').waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({tag:el.tagName, cls:el.className, right:el.getBoundingClientRect().right})).slice(0,20)));
      await page.screenshot({path: `/app/artifacts/${route.replaceAll('/','-')}-mobile.png`, fullPage: true});
      assert.equal(overflow, false, `Mobile overflow: ${route}`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 24 lessons, all LaTeX blocks, math assets, notation guide, logarithm explorer, navigation, progress, search, attention, calculator, mobile layouts; no external requests or JS errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
