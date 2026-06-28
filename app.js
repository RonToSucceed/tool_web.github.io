const bases = [10, 2, 8, 16, 32];
const baseNames = { 2: '二進位', 8: '八進位', 10: '十進位', 16: '十六進位', 32: '三十二進位' };
const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const converter = document.querySelector('#base-converter');
const toast = document.querySelector('#toast');
let toastTimer;

function showToast(message = '已複製到剪貼簿') {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
}

async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  showToast();
}

function parseBigInt(value, base) {
  const raw = value.trim().toUpperCase();
  if (!raw || raw === '-') return null;
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  if (!body) throw new Error('empty');
  let result = 0n;
  for (const char of body) {
    const digit = digits.indexOf(char);
    if (digit < 0 || digit >= base) throw new Error('invalid digit');
    result = result * BigInt(base) + BigInt(digit);
  }
  return negative ? -result : result;
}

function buildBaseConverter() {
  bases.forEach(base => {
    const wrapper = document.createElement('div');
    wrapper.className = `base-field${base === 10 ? ' base-field-primary' : ''}`;
    wrapper.innerHTML = `
      <div class="field-label"><label for="base-${base}">${baseNames[base]}</label><span>BASE ${base}</span></div>
      <div class="input-line"><input id="base-${base}" data-base="${base}" inputmode="${base === 10 ? 'numeric' : 'text'}" autocomplete="off" spellcheck="false" placeholder="${base === 10 ? '在此輸入十進位整數' : `例如 ${base === 16 ? 'FF' : base === 2 ? '1010' : '…'}`}"><button type="button" class="icon-button" aria-label="複製${baseNames[base]}">複製</button></div>`;
    const input = wrapper.querySelector('input');
    input.addEventListener('input', () => updateBases(input));
    wrapper.querySelector('button').addEventListener('click', () => copyText(input.value));
    converter.append(wrapper);
  });
}

function updateBases(source) {
  const sourceWrapper = source.closest('.base-field');
  sourceWrapper.classList.remove('is-error');
  document.querySelectorAll('.base-field input').forEach(input => input.removeAttribute('aria-invalid'));
  if (!source.value.trim()) {
    document.querySelectorAll('.base-field input').forEach(input => { if (input !== source) input.value = ''; });
    return;
  }
  try {
    const value = parseBigInt(source.value, Number(source.dataset.base));
    if (value === null) return;
    document.querySelectorAll('.base-field input').forEach(input => {
      if (input !== source) input.value = value.toString(Number(input.dataset.base)).toUpperCase();
    });
  } catch {
    sourceWrapper.classList.add('is-error');
    source.setAttribute('aria-invalid', 'true');
  }
}

function setupTabs() {
  const tabs = [...document.querySelectorAll('.tool-tab')];
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      activateTab(tabs[next]);
      tabs[next].focus();
    });
  });
  function activateTab(active) {
    tabs.forEach(tab => {
      const selected = tab === active;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.querySelector(`#panel-${tab.dataset.tool}`);
      panel.hidden = !selected;
      panel.classList.toggle('is-active', selected);
    });
    history.replaceState(null, '', `#${active.dataset.tool}`);
  }
  const initial = tabs.find(tab => `#${tab.dataset.tool}` === location.hash);
  if (initial) activateTab(initial);
}

const channels = ['R', 'G', 'B'];
let rgb = [79, 109, 245];

function buildColorFields() {
  const integerGrid = document.querySelector('#rgb-integers');
  const normalizedGrid = document.querySelector('#rgb-normalized');
  channels.forEach((channel, index) => {
    integerGrid.insertAdjacentHTML('beforeend', `<div class="channel-field"><label for="rgb-${channel.toLowerCase()}">${channel}</label><input id="rgb-${channel.toLowerCase()}" data-index="${index}" type="number" min="0" max="255" value="${rgb[index]}" aria-label="${channel} 十進位"></div>`);
    normalizedGrid.insertAdjacentHTML('beforeend', `<div class="channel-field"><label for="norm-${channel.toLowerCase()}">${channel}</label><input id="norm-${channel.toLowerCase()}" data-index="${index}" type="number" min="0" max="1" step="0.001" value="${(rgb[index] / 255).toFixed(3)}" aria-label="${channel} 小數值"></div>`);
  });
  integerGrid.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    if (input.value === '') return;
    rgb[Number(input.dataset.index)] = clamp(Math.round(Number(input.value) || 0), 0, 255);
    renderColor('integer');
  }));
  normalizedGrid.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    if (input.value === '') return;
    rgb[Number(input.dataset.index)] = Math.round(clamp(Number(input.value) || 0, 0, 1) * 255);
    renderColor('normalized');
  }));
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toHex = value => value.toString(16).padStart(2, '0').toUpperCase();

function renderColor(source) {
  const hex = rgb.map(toHex).join('');
  document.querySelector('#color-preview').style.backgroundColor = `#${hex}`;
  document.querySelector('#contrast-preview').style.backgroundColor = `#${hex}`;
  document.querySelector('#native-picker').value = `#${hex}`;
  document.documentElement.style.setProperty('--accent', `#${hex}`);
  if (source !== 'hex') document.querySelector('#hex-value').value = hex;
  if (source !== 'integer') channels.forEach((channel, i) => document.querySelector(`#rgb-${channel.toLowerCase()}`).value = rgb[i]);
  if (source !== 'normalized') channels.forEach((channel, i) => document.querySelector(`#norm-${channel.toLowerCase()}`).value = (rgb[i] / 255).toFixed(3));
}

function setupColorEvents() {
  document.querySelector('#native-picker').addEventListener('input', event => {
    const value = event.target.value.slice(1);
    rgb = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16));
    renderColor('picker');
  });
  const hexInput = document.querySelector('#hex-value');
  hexInput.addEventListener('input', () => {
    const value = hexInput.value.replace(/^#/, '').toUpperCase();
    hexInput.value = value.replace(/[^0-9A-F]/g, '').slice(0, 6);
    if (hexInput.value.length === 6) {
      rgb = [0, 2, 4].map(i => parseInt(hexInput.value.slice(i, i + 2), 16));
      renderColor('hex');
    }
  });
  document.querySelector('[data-copy="hex-value"]').addEventListener('click', () => copyText(`#${hexInput.value}`));
}

buildBaseConverter();
buildColorFields();
setupTabs();
setupColorEvents();
renderColor();

// 3D rotation converter. Internally all representations pass through a unit quaternion.
const rotationIds = {
  quaternion: ['quat-w', 'quat-x', 'quat-y', 'quat-z'],
  euler: ['euler-roll', 'euler-pitch', 'euler-yaw'],
  axisAngle: ['axis-x', 'axis-y', 'axis-z', 'axis-angle']
};
const rotationStatus = document.querySelector('#rotation-status');
const matrixContainer = document.querySelector('#matrix-fields');

for (let index = 0; index < 9; index += 1) {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = 'any';
  input.id = `matrix-${index}`;
  input.value = index % 4 === 0 ? '1' : '0';
  input.setAttribute('aria-label', `矩陣第 ${Math.floor(index / 3) + 1} 列第 ${(index % 3) + 1} 欄`);
  matrixContainer.append(input);
}

function valuesOf(ids) {
  const values = ids.map(id => Number(document.querySelector(`#${id}`).value));
  if (values.some(value => !Number.isFinite(value))) throw new Error('請完整填入所有數值');
  return values;
}

function normalizeQuaternion(quaternion) {
  const length = Math.hypot(...quaternion);
  if (length < 1e-12) throw new Error('Quaternion 長度不可為 0');
  return quaternion.map(value => value / length);
}

function quaternionFromEuler([rollDeg, pitchDeg, yawDeg]) {
  const [roll, pitch, yaw] = [rollDeg, pitchDeg, yawDeg].map(value => value * Math.PI / 180 / 2);
  const [cr, sr, cp, sp, cy, sy] = [Math.cos(roll), Math.sin(roll), Math.cos(pitch), Math.sin(pitch), Math.cos(yaw), Math.sin(yaw)];
  return normalizeQuaternion([
    cr * cp * cy + sr * sp * sy,
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy
  ]);
}

function quaternionFromAxisAngle([x, y, z, angleDeg]) {
  const axisLength = Math.hypot(x, y, z);
  if (axisLength < 1e-12) throw new Error('旋轉軸長度不可為 0');
  const halfAngle = angleDeg * Math.PI / 360;
  const scale = Math.sin(halfAngle) / axisLength;
  return normalizeQuaternion([Math.cos(halfAngle), x * scale, y * scale, z * scale]);
}

function quaternionFromMatrix(matrix) {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = matrix;
  const rows = [[m00, m01, m02], [m10, m11, m12], [m20, m21, m22]];
  const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
  const determinant = m00 * (m11 * m22 - m12 * m21) - m01 * (m10 * m22 - m12 * m20) + m02 * (m10 * m21 - m11 * m20);
  const isOrthonormal = rows.every(row => Math.abs(dot(row, row) - 1) < 0.02)
    && Math.abs(dot(rows[0], rows[1])) < 0.02
    && Math.abs(dot(rows[0], rows[2])) < 0.02
    && Math.abs(dot(rows[1], rows[2])) < 0.02;
  if (!isOrthonormal || Math.abs(determinant - 1) >= 0.02) {
    throw new Error('Matrix 必須是正交矩陣，且 determinant 應接近 +1');
  }
  const trace = m00 + m11 + m22;
  let quaternion;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    quaternion = [s / 4, (m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    quaternion = [(m21 - m12) / s, s / 4, (m01 + m10) / s, (m02 + m20) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    quaternion = [(m02 - m20) / s, (m01 + m10) / s, s / 4, (m12 + m21) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    quaternion = [(m10 - m01) / s, (m02 + m20) / s, (m12 + m21) / s, s / 4];
  }
  return normalizeQuaternion(quaternion);
}

function matrixFromQuaternion([w, x, y, z]) {
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)
  ];
}

function eulerFromQuaternion([w, x, y, z]) {
  const roll = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y));
  const pitchTerm = 2 * (w * y - z * x);
  const pitch = Math.abs(pitchTerm) >= 1 ? Math.sign(pitchTerm) * Math.PI / 2 : Math.asin(pitchTerm);
  const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  return [roll, pitch, yaw].map(value => value * 180 / Math.PI);
}

function axisAngleFromQuaternion(quaternion) {
  let [w, x, y, z] = quaternion;
  if (w < 0) [w, x, y, z] = [-w, -x, -y, -z];
  const angle = 2 * Math.acos(clamp(w, -1, 1));
  const scale = Math.sqrt(Math.max(0, 1 - w * w));
  const axis = scale < 1e-8 ? [1, 0, 0] : [x / scale, y / scale, z / scale];
  return [...axis, angle * 180 / Math.PI];
}

function formatRotationValue(value) {
  const clean = Math.abs(value) < 5e-11 ? 0 : value;
  return Number(clean.toFixed(8)).toString();
}

function setRotationValues(ids, values) {
  ids.forEach((id, index) => { document.querySelector(`#${id}`).value = formatRotationValue(values[index]); });
}

function renderRotation(quaternion) {
  const normalized = normalizeQuaternion(quaternion);
  setRotationValues(rotationIds.quaternion, normalized);
  setRotationValues([...Array(9)].map((_, i) => `matrix-${i}`), matrixFromQuaternion(normalized));
  setRotationValues(rotationIds.euler, eulerFromQuaternion(normalized));
  setRotationValues(rotationIds.axisAngle, axisAngleFromQuaternion(normalized));
  rotationStatus.classList.remove('is-error');
  rotationStatus.textContent = '轉換完成；Quaternion 已自動正規化，顯示值最多保留 8 位小數。';
}

document.querySelectorAll('[data-rotation-source]').forEach(button => {
  button.addEventListener('click', () => {
    try {
      const source = button.dataset.rotationSource;
      let quaternion;
      if (source === 'quaternion') quaternion = normalizeQuaternion(valuesOf(rotationIds.quaternion));
      if (source === 'matrix') quaternion = quaternionFromMatrix(valuesOf([...Array(9)].map((_, i) => `matrix-${i}`)));
      if (source === 'euler') quaternion = quaternionFromEuler(valuesOf(rotationIds.euler));
      if (source === 'axis-angle') quaternion = quaternionFromAxisAngle(valuesOf(rotationIds.axisAngle));
      renderRotation(quaternion);
    } catch (error) {
      rotationStatus.classList.add('is-error');
      rotationStatus.textContent = error.message;
    }
  });
});
