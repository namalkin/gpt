'use strict';

// Math assets and fonts are vendored: no CDN or runtime network dependency.
function renderLessonMath(root) {
  if (!window.katex || !window.renderMathInElement) return;
  const options = {throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml'};
  root.querySelectorAll('pre > code.language-math').forEach(code => {
    const source = code.textContent.trim();
    const figure = document.createElement('figure');
    figure.className = 'math-block';
    const equation = document.createElement('div');
    equation.className = 'math-equation';
    katex.render(source, equation, {...options, displayMode: true});
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'math-copy';
    button.textContent = 'Копировать LaTeX';
    button.addEventListener('click', () => copy(source));
    figure.append(equation, button);
    code.parentElement.replaceWith(figure);
  });
  renderMathInElement(root, {
    ...options,
    delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}],
    ignoredClasses: ['math-equation', 'katex']
  });
}

function enhanceLesson(root) {
  const guide = document.createElement('details');
  guide.className = 'notation-guide';
  guide.innerHTML = `<summary>Как читать обозначения</summary><p>Буквы — имена переменных. Их смысл задаётся перед формулой. Для начального раздела:</p>
    <dl><dt>$x_i$</dt><dd>токен на позиции i</dd>
    <dt>$i$, $t$</dt><dd>i — перебираемый номер, t — длина рассматриваемого текста</dd>
    <dt>$v$, $\\mathcal{V}$</dt><dd>v — один кандидат; каллиграфическая V — весь словарь</dd>
    <dt>$p(A\\mid B)$</dt><dd>вероятность A при условии, что B уже известно</dd>
    <dt>$\\prod$, $\\sum$</dt><dd>перемножить или сложить элементы в указанном диапазоне</dd>
    <dt>$\\theta$, $L$</dt><dd>обучаемые веса и ошибка; $L(\\theta)$ — ошибка как функция весов</dd>
    <dt>$-\\ln p$</dt><dd>штраф за вероятность правильного варианта: чем она меньше, тем штраф больше</dd></dl>
    <a href="#lesson/problem">Разобрать обозначения на примере «кот спит»</a>`;
  root.querySelector('article').before(guide);
  const explorer = root.querySelector('#log-explorer');
  if (explorer) initLogExplorer(explorer);
  renderLessonMath(root);
}

function initLogExplorer(root) {
  root.className = 'log-explorer';
  root.innerHTML = `<h3>Почувствовать шкалу ошибки</h3><p>Двигайте ползунок: насколько вероятным модель считала правильный токен?</p>
    <label class="field" for="log-probability">Вероятность правильного токена: <output id="log-probability-label">60%</output>
    <input id="log-probability" type="range" min="1" max="100" value="60" step="1"></label>
    <div class="log-output" aria-live="polite"></div><div class="log-chart"></div>
    <p class="hint">Третье число — вероятность цепочки из трёх правильных токенов, если каждому модель назначила эту условную вероятность. График показывает штраф одного токена при p от 0,01 до 1. В точке p=0 логарифм не определён; при приближении к нулю штраф растёт без границы.</p>`;
  const update = () => {
    const p = Number(root.querySelector('input').value) / 100, loss = -Math.log(p);
    root.querySelector('output').textContent = `${Math.round(p*100)}%`;
    root.querySelector('.log-output').innerHTML = `<span>p = <strong>${p.toFixed(2)}</strong></span><span>−ln p = <strong>${loss.toFixed(3)}</strong></span><span>p · p · p = <strong>${(p**3).toFixed(6)}</strong></span>`;
    const px = x => 35 + 310*x, py = y => 182 - y/Math.log(100)*140;
    const path = Array.from({length:100}, (_,i) => { const x=(i+1)/100; return `${i?'L':'M'}${px(x).toFixed(2)},${py(-Math.log(x)).toFixed(2)}`; }).join(' ');
    root.querySelector('.log-chart').innerHTML = `<svg viewBox="0 0 380 230" role="img" aria-label="График отрицательного логарифма. При вероятности ${p.toFixed(2)} ошибка ${loss.toFixed(3)}.">
      <path d="M35 25V182H355" fill="none" stroke="#92a695" stroke-width="1.5"/>
      <text x="10" y="18">−ln p</text><text x="355" y="214">p</text>
      ${[0,1,2,3,4].map(y=>`<text x="12" y="${py(y)+5}">${y}</text>`).join('')}
      ${[.1,.5,1].map(x=>`<text x="${px(x)-8}" y="207">${x}</text>`).join('')}
      <path d="${path}" fill="none" stroke="#245d45" stroke-width="3"/>
      <path d="M${px(p)} 182V${py(loss)}H35" fill="none" stroke="#6c8d52" stroke-dasharray="4 4"/>
      <circle cx="${px(p)}" cy="${py(loss)}" r="6" fill="#245d45" stroke="#d0f27d" stroke-width="3"/>
      </svg>`;
  };
  root.querySelector('input').addEventListener('input', update);
  update();
}
