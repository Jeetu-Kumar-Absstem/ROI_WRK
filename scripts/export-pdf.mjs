import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

function getArg(name, defVal) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defVal;
}

const baseUrl = getArg('url', 'http://localhost:5174/');
const tab = getArg('tab', 'psa-vs-liquid');
const calc = getArg('calc', 'calculator-1');
const out = getArg('out', `exports/Report-${tab}-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`);

const TAB_LABELS = {
  'psa-vs-liquid': 'PSA Vs Liquid',
  'psa-vs-cylinders': 'PSA Vs Cylinders',
  'psa-vs-any-psa': 'PSA vs Any PSA',
  'psa-vs-psa-deoxo': 'PSA vs PSA+Deoxo',
  cmc: 'CMC',
};

const CMC_CALC_LABELS = {
  'calculator-1': 'Calculator 1',
  'calculator_1': 'Calculator 1',
  '1': 'Calculator 1',
  'calculator-2': 'Calculator 2',
  'calculator_2': 'Calculator 2',
  '2': 'Calculator 2',
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });

  // Navigate and wait for network to settle
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  // Click the desired tab by label
  const targetLabel = TAB_LABELS[tab] || tab;
  await page.waitForSelector('nav[aria-label="Tabs"]');
  const buttons = await page.$$('nav[aria-label="Tabs"] button');
  for (const btn of buttons) {
    const txt = (await btn.textContent()) || '';
    if (txt.includes(targetLabel)) {
      await btn.click();
      break;
    }
  }

  if (tab === 'cmc') {
    const targetCalcLabel = CMC_CALC_LABELS[calc] || 'Calculator 1';
    await page.waitForSelector('[data-cmc-calculator-tabs] button');
    const calcButtons = await page.$$('[data-cmc-calculator-tabs] button');
    for (const btn of calcButtons) {
      const txt = (await btn.textContent()) || '';
      if (txt.includes(targetCalcLabel)) {
        await btn.click();
        break;
      }
    }
  }

  // Switch to print media so print-only containers become visible
  await page.emulateMedia({ media: 'print' });
  // Ensure report pages render (print containers visible)
  await page.waitForSelector('.print-container', { timeout: 30000, state: 'visible' });
  // Give charts time to finish layout
  await page.waitForTimeout(600);

  const outPath = path.resolve(out);
  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
  });

  console.log(`PDF saved: ${outPath}`);
  await browser.close();
})();
