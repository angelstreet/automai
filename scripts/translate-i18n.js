// Create this as scripts/translate-i18n.mjs
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceFile = path.resolve('./src/i18n/messages/en.json');
const outputDir = path.resolve('./src/i18n/messages');
const languages = ['fr', 'es', 'it', 'de'];

async function translateText(text, targetLang) {
  return new Promise((resolve, reject) => {
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodedText}`;

    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const translatedText = JSON.parse(data)[0][0][0];
            resolve(translatedText);
          } catch (e) {
            reject(new Error(`Translation error: ${e.message}`));
          }
        });
      })
      .on('error', reject);
  });
}

async function translateJson() {
  const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

  async function processObject(obj, lang) {
    const result = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        result[key] = await processObject(value, lang);
      } else if (typeof value === 'string' && value.trim()) {
        try {
          const translated = await translateText(value, lang);
          result[key] = translated;
          process.stdout.write('.');
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`\nError translating "${value}" to ${lang}`);
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  for (const lang of languages) {
    console.log(`\nTranslating to ${lang}...`);
    const translated = await processObject(sourceData, lang);
    const outputFile = path.join(outputDir, `${lang}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(translated, null, 2));
    console.log(`\nCreated ${outputFile}`);
  }
}

translateJson().catch(console.error);
