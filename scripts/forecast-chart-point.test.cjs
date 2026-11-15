const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// The web adapter has no platform dependencies; compile JSX with the project's TypeScript.
const filename = path.resolve(__dirname, '../src/components/admin/forecast/forecast-chart-point.web.tsx');
const adapter = new Module(filename, module);
adapter.filename = filename;
adapter.paths = Module._nodeModulePaths(path.dirname(filename));
adapter._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { ForecastChartPoint } = adapter.exports;
const point = (onSelect = () => {}) => ForecastChartPoint({
  cx: 100, cy: 80, fill: '#28765b', opacity: 0.5, label: '2025-10-31: 100.000 đ', onSelect,
});

test('web points render standard SVG without React Native responder handlers', () => {
  const element = point();
  assert.equal(element.type, 'circle');
  assert.deepEqual(Object.keys(element.props).filter(key => /^(onResponder|onStartShould|onPress)/.test(key)), []);
  const markup = renderToStaticMarkup(React.createElement('svg', null, element));
  assert.match(markup, /^<svg><circle /);
  assert.match(markup, /cx="100"/);
  assert.match(markup, /aria-label="2025-10-31: 100\.000 đ"/);
  assert.match(markup, /<title>/);
});

test('click selects the point once', () => {
  let selected = 0;
  point(() => { selected += 1; }).props.onClick();
  assert.equal(selected, 1);
});

test('Enter and Space select the focused point without scrolling the page', () => {
  let selected = 0;
  let prevented = 0;
  const element = point(() => { selected += 1; });
  assert.equal(element.props.role, 'button');
  assert.equal(element.props.tabIndex, 0);
  for (const key of ['Enter', ' ', 'ArrowRight']) {
    element.props.onKeyDown({ key, preventDefault: () => { prevented += 1; } });
  }
  assert.equal(selected, 2);
  assert.equal(prevented, 2);
});
