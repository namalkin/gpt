'use strict';
let course;
const main = document.querySelector('main');
const progressKey = 'transformer-course-v1';
let completed = new Set();
try { completed = new Set(JSON.parse(localStorage.getItem(progressKey) || '[]')); } catch (_) { /* Storage can be disabled. */ }
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer;
function toast(message) {
  const node = document.querySelector('#toast'); node.textContent = message; node.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 3000);
}
function saveProgress() {
  try { localStorage.setItem(progressKey, JSON.stringify([...completed])); }
  catch (_) { toast('Хранилище браузера недоступно: отметки сохранятся только до закрытия страницы.'); }
}
const symbols = ['{ }', '∑', '∇', 'QKᵀ', 'GPT', '∥'];
const lessonCount = n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'урок' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'урока' : 'уроков'}`;
const descriptions = [
  'Поставить задачу, запустить лабораторию и освоить необходимые основы Python.',
  'Разобраться в векторах, матрицах, вероятностях и производных на конкретных числах.',
  'Самостоятельно вывести градиенты и понять, как ошибка превращается в новые веса.',
  'Прийти к attention из требований и собрать полный блок трансформера.',
  'Реализовать, обучить и проверить свою маленькую языковую модель.',
  'Посчитать стоимость, разобраться в современных подходах и защитить свой проект.'
];
function continueLesson() { return course.lessons.find(l => !completed.has(l.id)) || course.lessons[0]; }
function home() {
  const done = course.lessons.filter(l => completed.has(l.id)).length;
  main.innerHTML = `<div class="container">
    <section class="hero"><div><p class="eyebrow">ОТ ПЕРВОГО ВЕКТОРА ДО СОБСТВЕННОГО GPT</p>
      <h1>Трансформер.<br><span>Понять изнутри.</span></h1>
      <p class="description">Не запомнить схему, а вывести её самому. Математика на бумаге, эксперименты в коде и модель, которую вы обучите с нуля.</p>
      <div class="actions"><a class="button primary" href="#lesson/${continueLesson().id}">${done ? 'Продолжить обучение' : 'Начать с нуля'}</a><a class="button" href="#attention">Исследовать attention</a></div>
      <div class="hero-meta"><span>24 урока</span><span>6 модулей</span><span>На русском</span></div></div>
      <div class="schematic" aria-label="Схема: токены, embeddings, параллельные головы attention, MLP, вероятности"><div class="diagram-title"><span>ВНУТРИ МОДЕЛИ</span><span>DECODER-ONLY</span></div>
      <div class="diagram-flow"><div class="node">«модель учится …»</div><div class="connector"></div><div class="node">Embedding + позиция</div><div class="connector"></div><div class="parallel"><span>Q · K · V</span><span>Q · K · V</span><span>Q · K · V</span></div><div class="connector"></div><div class="node">Attention + MLP</div><div class="connector"></div><div class="node accent">p(следующий токен | контекст)</div></div><p class="diagram-foot">Числа. Преобразования. Обучаемые связи.</p></div>
    </section>
    <div class="stats"><div><strong>С первого шага</strong><span>Школьной арифметики достаточно для старта</span></div><div><strong>Без пропусков</strong><span>Формулы, выводы, примеры и решения</span></div><div><strong>Своими руками</strong><span>Работающий GPT на Python и PyTorch</span></div><div><strong>На вашем ПК</strong><span>Docker Compose · CPU достаточно</span></div></div>
    <section aria-labelledby="route-title"><div class="section-heading"><div><h2 id="route-title">Маршрут к пониманию</h2><p>Каждый модуль опирается на предыдущий. Идите по порядку.</p></div><div class="progress-label">${done} / 24 освоено<div class="progress-track"><span style="width:${done / 24 * 100}%"></span></div></div></div>
    <div class="module-grid">${course.modules.map((name, i) => {
      const lessons = course.lessons.filter(l => l.module === i);
      const n = lessons.filter(l => completed.has(l.id)).length;
      return `<a class="module-card" href="#lesson/${(lessons.find(l => !completed.has(l.id)) || lessons[0]).id}"><span class="module-symbol" aria-hidden="true">${symbols[i]}</span><div class="meta">МОДУЛЬ ${i + 1} · ${lessonCount(lessons.length).toLocaleUpperCase('ru')}</div><h3>${name}</h3><p>${descriptions[i]}</p><span class="module-status">${n ? `${n} из ${lessons.length} освоено` : 'Открыть модуль'}</span></a>`;
    }).join('')}</div></section>
    <div class="lab-strip"><section class="lab-card"><p class="eyebrow">ИНТЕРАКТИВНЫЙ ЭКСПЕРИМЕНТ</p><h3>Куда смотрит attention?</h3><p>Три токена, реальные числа. Изменяйте запрос и наблюдайте, как меняются веса и выход.</p><a class="button" href="#attention">Открыть лабораторию</a></section><section class="lab-card"><p class="eyebrow">ПРАКТИКУМ В КОНТЕЙНЕРЕ</p><h3>Математика становится кодом</h3><p>Сверьте ручной расчёт с PyTorch. Полная инструкция запуска — в первом уроке.</p><div class="command"><code>docker compose run --rm lab python -m labs.experiments math</code><button class="copy" type="button">Копировать</button></div></section></div>
  </div>`;
  wireCopies();
}
function sidebar(filter = '', selected = '') {
  const query = filter.toLocaleLowerCase('ru');
  let count = 0;
  let html = course.modules.map((name, i) => {
    const lessons = course.lessons.filter(l => l.module === i && (l.title.toLocaleLowerCase('ru').includes(query) || name.toLocaleLowerCase('ru').includes(query)));
    count += lessons.length;
    if (!lessons.length) return '';
    return `<div class="group-name">${i + 1}. ${name}</div>${lessons.map(l => `<a href="#lesson/${l.id}" class="lesson-link ${selected === l.id ? 'selected' : ''}" ${selected === l.id ? 'aria-current="page"' : ''}><span class="check">${completed.has(l.id) ? '✓' : '·'}</span><span>${l.title}<span class="lesson-time">${l.time}</span></span></a>`).join('')}`;
  }).join('');
  return count ? html : '<p class="search-empty">По этому названию уроков не найдено.</p>';
}
function lesson(id) {
  const item = course.lessons.find(l => l.id === id);
  if (!item) { main.innerHTML = '<div class="container"><h1>Урок не найден</h1><a href="#home">Открыть маршрут</a></div>'; return; }
  const index = course.lessons.indexOf(item);
  main.innerHTML = `<div class="reader"><aside class="sidebar" aria-label="Оглавление"><input id="search" type="search" aria-label="Поиск по названиям уроков" placeholder="Найти урок…"><div id="lesson-list">${sidebar('', id)}</div></aside>
    <div><div class="lesson-picker"><label for="mobile-lesson">Перейти к уроку</label><select id="mobile-lesson">${course.lessons.map(l => `<option value="${l.id}" ${l.id === id ? 'selected' : ''}>${l.module + 1}. ${l.title}</option>`).join('')}</select></div>
    <div class="reading-area"><div class="lesson-meta"><span>МОДУЛЬ ${item.module + 1} / УРОК ${index + 1}</span><span>${item.time}</span><button class="print-button" id="print" type="button">Печать / PDF</button></div><article class="article">${item.html}</article>
    <div class="reader-actions"><button class="button ${completed.has(id) ? '' : 'primary'}" id="complete" type="button">${completed.has(id) ? '✓ Освоен · снять отметку' : 'Урок освоен'}</button><div class="actions">${index ? `<a class="button" href="#lesson/${course.lessons[index - 1].id}">Предыдущий</a>` : ''}${index < course.lessons.length - 1 ? `<a class="button" href="#lesson/${course.lessons[index + 1].id}">Следующий урок</a>` : '<a class="button" href="#home">К маршруту</a>'}</div></div></div></div></div>`;
  enhanceLesson(document.querySelector('.reading-area'));
  document.querySelector('#search').addEventListener('input', event => document.querySelector('#lesson-list').innerHTML = sidebar(event.target.value, id));
  document.querySelector('#mobile-lesson').addEventListener('change', event => location.hash = `lesson/${event.target.value}`);
  document.querySelector('#print').addEventListener('click', () => window.print());
  document.querySelector('#complete').addEventListener('click', event => {
    completed.has(id) ? completed.delete(id) : completed.add(id); saveProgress();
    event.target.textContent = completed.has(id) ? '✓ Освоен · снять отметку' : 'Урок освоен';
    event.target.classList.toggle('primary', !completed.has(id));
    document.querySelector('#lesson-list').innerHTML = sidebar(document.querySelector('#search').value, id);
  });
  // Add copy buttons to command/code blocks without changing their text content.
  document.querySelectorAll('.article pre').forEach(pre => {
    const button = document.createElement('button'); button.textContent = 'Копировать'; button.className = 'button'; button.type = 'button';
    button.style.cssText = 'font-size:12px;min-height:30px;padding:4px 10px;margin-top:-14px;margin-bottom:14px';
    button.addEventListener('click', () => copy(pre.textContent)); pre.after(button);
  });
}
async function copy(value) {
  try { await navigator.clipboard.writeText(value); toast('Скопировано'); }
  catch (_) { toast('Не удалось скопировать. Выделите текст вручную.'); }
}
function wireCopies() { document.querySelectorAll('.command .copy').forEach(b => b.addEventListener('click', () => copy(b.parentElement.querySelector('code').textContent))); }
function softmax(values) { const m = Math.max(...values), exps = values.map(x => Math.exp(x - m)), total = exps.reduce((a,b) => a+b,0); return exps.map(x => x / total); }
function attentionPage() {
  main.innerHTML = `<div class="container"><div class="interactive-title"><p class="eyebrow">ЛАБОРАТОРИЯ / ATTENTION</p><h1>Посмотреть внутрь одной головы</h1><p>Здесь нет скрытой магии: запрос сравнивается с ключами, оценки превращаются в веса, а веса смешивают значения. Это численный пример из урока 13.</p></div>
  <div class="lab-layout"><section class="panel"><h2>Управление экспериментом</h2>
    <label class="field">Наблюдаемая позиция<select id="query"><option value="0">1 · начало последовательности</option><option value="1">2 · середина</option><option value="2" selected>3 · конец</option></select></label>
    <label class="field">Масштаб запроса: <output id="scale-label">1.0</output><input id="scale" type="range" min="0" max="4" step="0.1" value="1"></label>
    <label class="field checkbox"><input id="causal" type="checkbox" checked>Причинная маска</label>
    <p class="hint">Масштаб меняет только Q выбранной позиции. K и V остаются прежними. При нулевом Q веса по разрешённым источникам равны.</p><a href="#lesson/attention">Разобрать формулы в уроке</a></section>
    <section class="panel"><div class="tensor-grid"><div><h2>Запросы и ключи</h2><pre>Q = K = [[1, 0],
         [0, 1],
         [1, 1]]</pre></div><div><h2>Передаваемые значения</h2><pre>V = [[2, 0],
     [0, 2],
     [4, 4]]</pre></div></div><div id="attention-result" aria-live="polite"></div></section></div></div>`;
  const update = () => {
    const selected = Number(document.querySelector('#query').value), scale = Number(document.querySelector('#scale').value), causal = document.querySelector('#causal').checked;
    document.querySelector('#scale-label').textContent = scale.toFixed(1);
    const vectors = [[1,0],[0,1],[1,1]], values = [[2,0],[0,2],[4,4]];
    const scores = vectors.map((q,i) => vectors.map((k,j) => causal && j > i ? -Infinity : (q[0]*k[0] + q[1]*k[1]) * (i === selected ? scale : 1) / Math.sqrt(2)));
    const weights = scores.map(softmax), a = weights[selected];
    const output = [0,1].map(d => a.reduce((sum,w,j) => sum + w * values[j][d],0));
    document.querySelector('#attention-result').innerHTML = `<h2 style="margin-top:28px">Веса A = softmax(QKᵀ / √2 + M)</h2><p class="hint">Строка — запрос. Столбец — источник. Выделена выбранная позиция.</p><table class="matrix"><caption class="hint">Вероятности внимания по источникам</caption><thead><tr><th scope="col">Q / K</th><th scope="col">K₁</th><th scope="col">K₂</th><th scope="col">K₃</th></tr></thead><tbody>${weights.map((row,i) => `<tr class="${i === selected ? 'focus' : ''}"><th scope="row">Q${i+1}</th>${row.map((w,j) => `<td ${causal && j>i ? 'class="masked"' : ''} style="background:rgba(116,161,73,${.08 + .65*w})">${causal && j>i ? 'маска' : w.toFixed(4)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="formula-result">S${selected+1} = [${scores[selected].map(x => Number.isFinite(x) ? x.toFixed(3) : '−∞').join(', ')}]<br>A${selected+1} = [${a.map(x => x.toFixed(4)).join(', ')}]<br>O${selected+1} = Σⱼ A${selected+1},ⱼ Vⱼ = [${output.map(x => x.toFixed(4)).join(', ')}]</div><p class="hint">Сумма выбранной строки: ${a.reduce((x,y)=>x+y,0).toFixed(6)}. Выход — вектор длины 2, а не номер выбранного источника.</p>`;
  };
  ['query','scale','causal'].forEach(id => document.getElementById(id).addEventListener('input',update)); update();
}
const format = n => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);
function computePage() {
  main.innerHTML = `<div class="container"><div class="interactive-title"><p class="eyebrow">ЛАБОРАТОРИЯ / ВЫЧИСЛИТЕЛЬНЫЙ БЮДЖЕТ</p><h1>Откуда берётся стоимость модели</h1><p>Измените размеры и проследите, что растёт линейно, а что квадратично. Оценки относятся к плотному учебному GPT с MLP ширины 4D.</p></div><div class="lab-layout"><section class="panel"><h2>Конфигурация</h2>
    ${[['batch','Пакет B',8,1,128],['context','Контекст T = T_max',128,8,8192],['dim','Ширина D',512,16,8192],['layers','Слои L',6,1,128],['heads','Головы H',8,1,128],['vocab','Словарь V',10000,16,200000]].map(([id,label,value,min,max])=>`<label class="field">${label}<input id="${id}" type="number" min="${min}" max="${max}" value="${value}" step="1" required></label>`).join('')}
    <a href="#lesson/compute">Как выводятся оценки</a></section><section class="panel"><h2>Порядок величин</h2><div id="compute-result" aria-live="polite"></div></section></div></div>`;
  const update = () => {
    const fields = ['batch','context','dim','layers','heads','vocab'].map(id => document.getElementById(id));
    const target = document.querySelector('#compute-result');
    if (fields.some(input => !input.checkValidity())) { target.innerHTML = '<p class="hint">Введите целые значения в указанных пределах.</p>'; return; }
    const [B,T,D,L,H,V] = fields.map(input => Number(input.value));
    if (D % H) { target.innerHTML = '<p class="hint">Ширина D должна делиться на число голов H.</p>'; return; }
    const params = 2*V*D + T*D + L*(12*D*D+4*D)+2*D;
    const linear = L*24*B*T*D*D, pairs = L*4*B*T*T*D, head = 2*B*T*D*V;
    const total = linear + pairs + head, scores = B*H*T*T*2, cache = 2*L*B*T*D*2;
    target.innerHTML = `<div class="result-grid"><div class="metric"><span>Обучаемые параметры</span><strong>${format(params / 1e6)} млн</strong><span>Embedding, блоки и выход</span></div><div class="metric"><span>Один прямой проход</span><strong>${format(total / 1e9)} GFLOPs</strong><span>Основные матричные операции</span></div><div class="metric"><span>Веса + grad + Adam, FP32</span><strong>${format(16*params / 2**30)} GiB</strong><span>Без активаций и буферов</span></div><div class="metric"><span>KV cache, BF16, все слои</span><strong>${format(cache / 2**30)} GiB</strong><span>Inference, обычный MHA</span></div></div>
      <div class="breakdown"><h2>Из чего складываются FLOPs</h2><div class="bars">${[['Проекции и MLP',linear],['Попарное attention',pairs],['Выход в словарь',head]].map(([label,value])=>`<div class="bar-row"><span>${label}</span><div class="bar-track"><span style="width:${value / total * 100}%"></span></div><span>${format(value / total * 100)}%</span></div>`).join('')}</div></div>
      <div class="formula-result" style="margin-top:25px">Блоки: L(24BTD² + 4BT²D)<br>Выход: 2BTDV<br>Scores одного слоя, BF16: ${format(scores / 2**20)} MiB</div>
      <p class="hint">Умножение и сложение считаются двумя FLOPs. Norm, softmax, активации и служебные операции не учтены. Обучение с backward для крупных матричных операций — грубо около 3× forward. Это оценки объёма работы, а не времени в секундах.</p><p class="hint">Память Adam и KV cache относятся к разным режимам: их не нужно автоматически складывать. Показана только одна матрица scores одного слоя, а не полный пик активаций. GiB = 2³⁰ байт.</p>`;
  };
  document.querySelectorAll('.field input').forEach(input => input.addEventListener('input',update)); update();
}
function route() {
  const hash = location.hash.slice(1) || 'home';
  const [page,id] = hash.split('/');
  document.querySelectorAll('[data-tab]').forEach(a => a.classList.toggle('active', a.dataset.tab === page));
  if (page === 'home') home();
  else if (page === 'lesson') lesson(id || 'start');
  else if (page === 'attention') attentionPage();
  else if (page === 'compute') computePage();
  else main.innerHTML = '<div class="container"><h1>Раздел не найден</h1><a href="#home">Вернуться к маршруту</a></div>';
  document.title = `${page === 'lesson' ? course.lessons.find(l=>l.id===id)?.title || 'Учебник' : {home:'Трансформер с нуля',attention:'Лаборатория attention',compute:'Бюджет вычислений'}[page] || 'Курс'} — Учебная лаборатория`;
  window.scrollTo(0,0);
}
fetch('/api/course').then(response => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json();
}).then(data => { course = data; route(); window.addEventListener('hashchange',route); }).catch(error => {
  main.innerHTML = `<div class="error"><h1>Не удалось загрузить учебник</h1><p>Проверьте запуск контейнера: <code>docker compose logs course</code>.</p><p>${escapeHTML(error.message)}</p><button class="button" onclick="location.reload()">Повторить</button></div>`;
});
