// scripts/convert-json-to-css.js
import { promises as fs } from 'fs';

async function convertJsonToCss(jsonFile, outputFile, themeName) {
  try {
    const json = JSON.parse(await fs.readFile(jsonFile, 'utf-8'));

    // Extract CSS variables from cssVars.light (or fallback to cssVars or root)
    const variablesObj = json.cssVars?.light || json.cssVars || json;
    if (!variablesObj || typeof variablesObj !== 'object') {
      throw new Error('No valid CSS variables found in JSON');
    }
    const variables = Object.entries(variablesObj)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

    // Extract additional CSS from css.light (or css, ensuring it’s a string)
    let additionalCss = '';
    if (json.css) {
      if (typeof json.css === 'string') {
        additionalCss = json.css;
      } else if (json.css.light && typeof json.css.light === 'string') {
        additionalCss = json.css.light;
      }
    }

    // Combine into themed CSS block
    const css = `.theme-${themeName} {\n${variables}\n${additionalCss ? `${additionalCss}\n` : ''}}`;
    await fs.writeFile(outputFile, css);
    console.log(`Converted ${jsonFile} to ${outputFile}`);
  } catch (error) {
    console.error(`Error processing ${jsonFile}: ${error.message}`);
    process.exit(1);
  }
}

// Parse command-line arguments
const [jsonFile, outputFile] = process.argv.slice(2);
if (!jsonFile || !outputFile) {
  console.error('Usage: node convert-json-to-css.js <json-file> <output-file>');
  process.exit(1);
}

// Run with "matsu" as the theme name
convertJsonToCss(jsonFile, outputFile, 'matsu');
