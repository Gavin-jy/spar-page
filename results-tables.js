const resultData = window.SPAR_RESULTS;

function resultTable(rows, headings, caption, options = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'results-table-scroll';
  wrapper.tabIndex = 0;
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('aria-label', caption);
  const table = document.createElement('table');
  const description = document.createElement('caption');
  description.textContent = caption;
  table.append(description);
  const head = table.createTHead().insertRow();
  ['Method / configuration', ...headings].forEach(text => {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = text;
    head.append(cell);
  });
  const body = table.createTBody();
  const rankings = headings.map((heading, index) => [...new Set(rows.map(row => row.values[index]))].sort((left, right) => right - left));
  rows.forEach(row => {
    const line = body.insertRow();
    const method = document.createElement('th');
    method.scope = 'row';
    method.textContent = row.method;
    line.append(method);
    row.values.forEach((value, column) => {
      const cell = line.insertCell();
      const number = document.createElement('span');
      number.textContent = value.toFixed(options.precision || 2);
      if (value === rankings[column][0]) {
        cell.classList.add('rank-first');
        number.className = 'best-score';
        number.setAttribute('aria-label', `${number.textContent}, best in column`);
      } else if (value === rankings[column][1]) {
        cell.classList.add('rank-second');
        number.className = 'second-score';
        number.setAttribute('aria-label', `${number.textContent}, second-best in column`);
      }
      cell.append(number);
      if (row.wins) {
        const win = document.createElement('small');
        win.textContent = row.wins[column] === null ? '—' : `${row.wins[column]}%`;
        win.setAttribute('aria-label', row.wins[column] === null ? 'Not applicable' : `SPAR win rate against ${row.method}: ${row.wins[column]} percent, excluding ties`);
        cell.append(win);
      }
    });
  });
  wrapper.append(table);
  return wrapper;
}

const breakdowns = {
  overall: {title: 'Benchmark scores and SPAR pairwise win rates', columns: ['Physics-IQ Verified ↑', 'PhyGenBench ↑', 'VideoPhy-2 Hard ↑'], note: 'Each cell shows the benchmark score / SPAR win rate against that method, excluding ties. Scores use a 0–100 scale. MiniMax-H3 reports the exact expectation of uniform selection from three candidates.'},
  phygen: {title: 'PhyGenBench · Physical categories', columns: ['Chemical', 'Force', 'Heat', 'Light', 'Physical', 'Overall'], note: 'PhyGenEval open-source scores, scaled to 0–100. Overall is the mean over 160 prompts, weighted by category size. Higher is better.'},
  physicsiq: {title: 'Physics-IQ Verified · Continuation similarity', columns: ['ST', 'SP', 'WS', 'MSE similarity', 'Overall'], note: 'ST: spatiotemporal similarity; SP: spatial similarity; WS: weighted spatial similarity. MSE is a normalized, inverted similarity score. All scores use a 0–100 scale; higher is better.'},
  videophy: {title: 'VideoPhy-2 Hard · Semantics and physics', columns: ['SA / 5', 'PC / 5', 'SA ≥ 4 (%)', 'PC ≥ 4 (%)', 'Joint success (%)'], note: 'GPT-6 Sol evaluation with the official prompts. SA: semantic adherence; PC: physical commonsense. Joint success requires both SA ≥ 4 and PC ≥ 4 in the same video.'},
};
function showBreakdown(key) {
  const spec = breakdowns[key];
  document.querySelector('#breakdown-table').replaceChildren(resultTable(resultData[key], spec.columns, spec.title));
  document.querySelector('#breakdown-table').dataset.theme = key;
  document.querySelector('#breakdown-note').textContent = spec.note;
  document.querySelectorAll('[data-breakdown]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.breakdown === key)));
}
document.querySelectorAll('[data-breakdown]').forEach(button => button.addEventListener('click', () => showBreakdown(button.dataset.breakdown)));
showBreakdown('physicsiq');

function showHuman(metric) {
  const chart = document.querySelector('#human-chart');
  const isTable = metric === 'table';
  chart.hidden = isTable;
  document.querySelector('.rating-axis').hidden = isTable;
  document.querySelector('#human-table-panel').hidden = !isTable;
  document.querySelector('#human-ranking-key').hidden = !isTable;
  document.querySelectorAll('[data-human-metric]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.humanMetric === String(metric))));
  if (isTable) {
    document.querySelector('#human-metric').textContent = 'Human ratings';
    return;
  }
  chart.replaceChildren();
  const label = metric === 0 ? 'Physical plausibility' : 'Event completion';
  document.querySelector('#human-metric').textContent = label;
  chart.setAttribute('aria-label', `${label}: mean ratings on a one-to-five scale. ${resultData.human.map(row => `${row.method}: ${row.values[metric].toFixed(3)}`).join('; ')}.`);
  resultData.human.forEach(row => {
    const line = document.createElement('div');
    line.className = 'rating-row';
    const name = document.createElement('span');
    name.textContent = row.method;
    const track = document.createElement('div');
    track.className = 'rating-track';
    const bar = document.createElement('div');
    bar.className = 'rating-bar';
    bar.style.width = `${(row.values[metric] - 1) / 4 * 100}%`;
    const value = document.createElement('span');
    value.className = 'rating-value';
    value.textContent = row.values[metric].toFixed(3);
    track.append(bar);
    line.append(name, track, value);
    chart.append(line);
  });
  chart.dataset.metric = String(metric);
}
document.querySelectorAll('[data-human-metric]').forEach(button => button.addEventListener('click', () => showHuman(button.dataset.humanMetric === 'table' ? 'table' : Number(button.dataset.humanMetric))));
showHuman(0);
document.querySelector('#human-table').append(resultTable(resultData.human,
  ['Physical plausibility ↑', 'Event completion ↑'], 'Mean human ratings on a 1–5 scale', {precision: 3}));
