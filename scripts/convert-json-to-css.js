const fs = require("fs").promises;

async function convertJsonToCss(jsonFile) {
  const json = JSON.parse(await fs.readFile(jsonFile, "utf-8"));
  const variables = Object.entries(json.variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
  return `.theme-matsu {\n${variables}\n${json.styles || ""}\n}`;
}

convertJsonToCss("matsu-theme.json").then(console.log).catch(console.error);const fs = require("fs").promises;

async function convertJsonToCss(jsonFile) {
  const json = JSON.parse(await fs.readFile(jsonFile, "utf-8"));
  const variables = Object.entries(json.variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
  return `.theme-matsu {\n${variables}\n${json.styles || ""}\n}`;
}

convertJsonToCss("matsu-theme.json").then(console.log).catch(console.error);