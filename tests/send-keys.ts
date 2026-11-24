// floawty's hotkey text as SendKeys syntax, for pressing it on the real desktop.
const MODIFIERS: Record<string, string> = { CTRL: '^', CONTROL: '^', ALT: '%', SHIFT: '+' };
const NAMED = new Set(['UP', 'DOWN', 'LEFT', 'RIGHT']);
// SendKeys knows F1 to F16.
const LAST_FUNCTION_KEY = 16;

function sendKey(name: string): string {
  const upper = name.toUpperCase();
  if (/^[A-Z0-9]$/.test(upper)) return upper.toLowerCase();
  if (upper === 'SPACE') return ' ';
  if (NAMED.has(upper)) return `{${upper}}`;
  const number = /^F(\d+)$/.exec(upper)?.[1];
  if (number !== undefined && Number(number) >= 1 && Number(number) <= LAST_FUNCTION_KEY) {
    return `{${upper}}`;
  }
  throw new Error(`SendKeys cannot press "${name}"`);
}

/** "Ctrl+Alt+Shift+T" becomes "^%+t". */
export function sendKeysFor(text: string): string {
  const names = text.split('+').map((part) => part.trim());
  const key = sendKey(names.pop() ?? '');
  const marks = names.map((name) => {
    const mark = MODIFIERS[name.toUpperCase()];
    if (!mark) throw new Error(`SendKeys cannot press "${name}"`);
    return mark;
  });
  return ['^', '%', '+'].filter((mark) => marks.includes(mark)).join('') + key;
}
