/* eslint-disable prefer-destructuring */

/* Constants */

const RU = 'ru';
const EN = 'en';

const CASE_DOWN = 'caseDown';
const CASE_UP = 'caseUp';
const CAPS = 'caps';
const SHIFT_CAPS = 'shiftCaps';
const CASING = [CASE_DOWN, CASE_UP, CAPS, SHIFT_CAPS];

const HIDDEN = 'hidden';
const ACTIVE = 'active';

/* Helper functions */

function makeLocale(u, v) {
  const makeObj = (a, b, c, d) => (
    {
      [CASE_DOWN]: a, [CASE_UP]: b, [CAPS]: c, [SHIFT_CAPS]: d,
    }
  );
  if (!v) {
    const uUp = (u.toUpperCase() !== u) ? u.toUpperCase() : u;
    return makeObj(u, uUp, uUp, u);
  }
  return makeObj(u, v, u, v);
}

function makeKey(name, en, ru) {
  if (name === undefined) { throw Error('name must not be undefined'); }
  const enFull = (en === undefined) ? [name] : en;
  const ruFull = (ru === undefined) ? enFull : ru;
  return { className: name, [EN]: makeLocale(...enFull), [RU]: makeLocale(...ruFull) };
}

function zip(...args) {
  const limit = Math.min(...args.map((a) => a.length));
  return [...Array(limit).keys()].map((i) => args.map((a) => a[i]));
}

const makeDigitKeys = (ds, csEn, csRu) => zip(ds, csEn, csRu).map(([d, cEn, cRu]) => makeKey(`Digit${d}`, [d, cEn], [d, cRu]));

const makeLetterKeys = (csEn, csRu) => zip(csEn, csRu).map(([cEn, cRu]) => makeKey(`Key${cEn.toUpperCase()}`, [cEn], [cRu]));

const ROWS = [
  [
    makeKey('Backquote', ['`', '~'], ['ё']),
    ...makeDigitKeys('1234567890', '!@#$%^&*()', '!"№;%:?*()'),
    makeKey('Minus', ['-', '_']),
    makeKey('Equal', ['=', '+']),
    makeKey('Backspace'),
  ],
  [
    makeKey('Tab'),
    ...makeLetterKeys('qwertyuiop', 'йцукенгшщз'),
    makeKey('BracketLeft', ['[', '{'], ['х']),
    makeKey('BracketRight', [']', '}'], ['ъ']),
    makeKey('Backslash', ['\\', '|'], ['\\', '/']),
    makeKey('Delete', ['Del']),
  ],
  [
    makeKey('CapsLock'),
    ...makeLetterKeys('asdfghjkl', 'фывапролд'),
    makeKey('Semicolon', [';', ':'], ['ж']),
    makeKey('Quote', ["'", '"'], ['э']),
    makeKey('Enter'),
  ],
  [
    makeKey('ShiftLeft', ['Shift']),
    ...makeLetterKeys('zxcvbnm', 'ячсмить'),
    makeKey('Comma', [',', '<'], ['б']),
    makeKey('Period', ['.', '>'], ['ю']),
    makeKey('Slash', ['/', '?'], ['.', ',']),
    makeKey('ArrowUp', ['↑']),
    makeKey('ShiftRight', ['Shift']),
  ],
  [
    makeKey('ControlLeft', ['Ctrl']),
    makeKey('AltLeft', ['Alt']),
    makeKey('Space', [' ']),
    makeKey('AltRight', ['Alt']),
    makeKey('ArrowLeft', ['←']),
    makeKey('ArrowDown', ['↓']),
    makeKey('ArrowRight', ['→']),
    makeKey('ControlRight', ['Ctrl']),
  ],
];

function makeSpan(lang, i, j, data, hidden = false) {
  const span = document.createElement('span');
  span.classList.add(lang);
  if (hidden) { span.classList.add(HIDDEN); }
  CASING.forEach((x, k) => {
    const postfix = (k === 0 && !hidden) ? '' : ` ${HIDDEN}`;
    const spanText = `<span class="${x}${postfix}">${data[i][j][lang][x]}</span>`;
    span.insertAdjacentHTML('beforeEnd', spanText);
  });
  return span;
}

/* Controller */

class Controller {
  constructor() {
    this.element = null;
    this.textarea = null;
    this.state = {
      isShiftLeftPressed: false,
      isShiftRightPressed: false,
      isCapsLockPressed: false,
      case: CASE_DOWN,
      lang: EN,
    };
    this.current = {
      element: null, code: null, event: null, char: null,
    };
    this.previous = {
      element: null, code: null, event: null, char: null,
    };
  }

  initPage() {
    document.body.classList.add('body');

    const container = document.createElement('div');
    container.classList.add('container');

    const title = document.createElement('p');
    title.innerText = 'Virtual Keyboard';
    title.classList.add('title');
    container.appendChild(title);

    const description = document.createElement('p');
    description.innerText = 'Created in Linux, use left Ctrl + Alt to switch locale';
    description.classList.add('description');
    container.appendChild(description);

    const language = document.createElement('p');
    language.innerText = `${this.state.lang.toUpperCase()}`;
    language.classList.add('language');
    language.setAttribute('id', 'language');
    container.appendChild(language);

    this.textarea = document.createElement('textarea');
    this.textarea.classList.add('textarea');
    this.textarea.setAttribute('id', 'textarea');
    container.appendChild(this.textarea);

    this.element = document.createElement('div');
    this.element.classList.add('keyboard');
    this.element.setAttribute('id', 'keyboard');

    const grid = document.createDocumentFragment();
    for (let i = 0; i < ROWS.length; i += 1) {
      const row = document.createElement('div');
      row.classList.add('row');
      for (let j = 0; j < ROWS[i].length; j += 1) {
        const cell = document.createElement('div');
        cell.classList.add('key', ROWS[i][j].className);
        cell.appendChild(makeSpan(RU, i, j, ROWS, true));
        cell.appendChild(makeSpan(EN, i, j, ROWS));
        row.appendChild(cell);
      }
      grid.appendChild(row);
    }
    this.element.appendChild(grid);
    container.appendChild(this.element);

    document.body.appendChild(container);

    if (localStorage.lang === RU) { this.toggleLang(); }
  }

  addActiveState() {
    this.current.element.classList.add(ACTIVE);
  }

  removeActiveState() {
    if (this.current.element) {
      if (this.previous.element && this.previous.element.classList.contains(ACTIVE) && !(['CapsLock', 'ShiftLeft', 'ShiftRight'].includes(this.previous.code))) { this.previous.element.classList.remove(ACTIVE); }
      this.current.element.classList.remove(ACTIVE);
    }
  }

  toggleCase() {
    const e = this.element.querySelectorAll(`div>.${this.state.lang}`);
    for (let i = 0; i < e.length; i += 1) {
      const spans = e[i].querySelectorAll('span');
      spans.forEach((s) => {
        if (!s.classList.contains(HIDDEN)) { s.classList.add(HIDDEN); }
      });
      let idx = 0;
      if (this.state.isCapsLockPressed) { idx += 2; }
      if (this.state.isShiftLeftPressed || this.state.isShiftRightPressed) { idx += 1; }
      spans[idx].classList.remove(HIDDEN);
      this.state.case = CASING[idx];
    }
  }

  updateLangItems() {
    const e = this.element.querySelectorAll(`div>.${this.state.lang}`);
    for (let i = 0; i < e.length; i += 1) {
      e[i].classList.toggle(HIDDEN);
      e[i].querySelectorAll(`span.${this.state.case}`)[0].classList.toggle(HIDDEN);
    }
  }

  toggleLang() {
    this.updateLangItems();
    this.state.lang = (this.state.lang === EN) ? RU : EN;
    localStorage.setItem('lang', this.state.lang);
    document.getElementById('language').innerText = `${this.state.lang.toUpperCase()}`;
    this.updateLangItems();
  }

  updateBuffer() {
    const buffer = this.textarea.value;
    const s = this.textarea.selectionStart;
    if (s >= 0 && s <= buffer.length) {
      this.textarea.value = buffer.slice(0, s) + this.current.char + buffer.slice(s, buffer.length);
      this.textarea.selectionStart = s + this.current.char.length;
      this.textarea.selectionEnd = this.textarea.selectionStart;
    } else {
      this.textarea.value += this.current.char;
    }
  }

  processKeyPress() {
    if (this.current.event.ctrlKey && this.current.event.altKey) { this.toggleLang(); }
    const e = this.textarea.value;
    const s = this.textarea.selectionStart;
    if (this.current.code === 'Backspace') {
      if (s !== 0) {
        this.textarea.value = e.slice(0, s - 1) + e.slice(s, e.length);
        this.textarea.selectionStart = s - 1;
        this.textarea.selectionEnd = this.textarea.selectionStart;
      }
    } else if (this.current.code === 'Delete') {
      if (s !== e.length) {
        this.textarea.value = e.slice(0, s) + e.slice(s + 1, e.length);
        this.textarea.selectionStart = s;
        this.textarea.selectionEnd = this.textarea.selectionStart;
      }
    } else if (this.current.code === 'ArrowLeft' || this.current.code === 'ArrowUp') {
      if (s !== 0) {
        this.textarea.selectionStart = s - 1;
        this.textarea.selectionEnd = this.textarea.selectionStart;
      }
    } else if (this.current.code === 'ArrowRight' || this.current.code === 'ArrowDown') {
      if (s !== e.length) {
        this.textarea.selectionStart = s + 1;
        this.textarea.selectionEnd = this.textarea.selectionStart;
      }
    } else if (this.current.code === 'CapsLock') {
      if (this.state.isCapsLockPressed && !this.current.event.repeat) {
        this.removeActiveState();
        this.state.isCapsLockPressed = false;
      } else {
        this.addActiveState();
        this.state.isCapsLockPressed = true;
      }
      this.toggleCase();
    } else if (this.current.code === 'ShiftLeft' || this.current.code === 'ShiftRight') {
      if (!(this.state.isShiftRightPressed || this.state.isShiftLeftPressed)) {
        this.addActiveState();
        if (this.current.code === 'ShiftLeft') {
          this.state.isShiftLeftPressed = true;
        } else { this.state.isShiftRightPressed = true; }
        this.toggleCase();
      }
    } else {
      if (this.current.code === 'Tab' || this.current.code === 'Enter') {
        this.current.char = (this.current.code === 'Tab') ? '\t' : '\n';
      }
      if (!(['AltLeft', 'AltRight', 'ControlLeft', 'ControlRight'].includes(this.current.code))) {
        this.updateBuffer();
      }
    }
  }

  keyDownHandler(e) {
    e.preventDefault();
    this.current.event = e;
    this.current.code = e.code;
    this.current.element = this.element.getElementsByClassName(e.code)[0];
    if (this.current.element) {
      this.current.char = this.current.element.querySelectorAll(`:not(.${HIDDEN})`)[1].textContent;
      this.processKeyPress();
      if (!['CapsLock', 'ShiftLeft', 'ShiftRight'].includes(this.current.code)) { this.addActiveState(); }
    }
  }

  keyUpHandler(e) {
    const s = this.element.getElementsByClassName(e.code)[0];
    if (s) {
      this.current.element = s.closest('div');
      if (e.code !== 'CapsLock') { this.removeActiveState(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (e.code === 'ShiftLeft') {
          this.state.isShiftLeftPressed = false;
          this.removeActiveState();
        } else {
          this.state.isShiftRightPressed = false;
          this.removeActiveState();
        }
        this.toggleCase();
      }
    }
  }

  mouseDownHandler(e) {
    if (e.target.tagName === 'SPAN') {
      this.current.event = e;
      this.current.element = e.target.closest('div');
      this.current.code = this.current.element.classList[1];
      this.current.char = e.target.textContent;
      this.processKeyPress();
      if (this.current.code !== 'CapsLock') { this.addActiveState(); }
      this.previous = { ...this.current };
      e.preventDefault();
    }
  }

  mouseUpHandler(e) {
    this.current.event = e;
    this.current.element = e.target.closest('div');
    if (this.current.element) {
      if (this.current.element.classList.contains('key')) {
        this.current.code = this.current.element.classList[1];
      } else {
        this.current = { ...this.previous };
      }
      if (this.current.code !== 'CapsLock') {
        this.removeActiveState();
        if (this.state.isShiftLeftPressed && this.current.code === 'ShiftLeft') {
          this.state.isShiftLeftPressed = false;
          this.toggleCase();
        }
        if (this.state.isShiftRightPressed && this.current.code === 'ShiftRight') {
          this.state.isShiftRightPressed = false;
          this.toggleCase();
        }
      }
    }
  }
}

/* Main loop */

const controller = new Controller();
controller.initPage();
document.addEventListener('keyup', (e) => controller.keyUpHandler(e));
document.addEventListener('keydown', (e) => controller.keyDownHandler(e));
document.addEventListener('mouseup', (e) => controller.mouseUpHandler(e));
controller.element.addEventListener('mousedown', (e) => controller.mouseDownHandler(e));
