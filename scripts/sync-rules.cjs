const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const customRulesPath = path.join(root, "src/customRules.json");
const codeGsPath = path.join(root, "apps-script/Code.gs");

function sync() {
  const customRules = JSON.parse(fs.readFileSync(customRulesPath, "utf8"));
  let codeGs = fs.readFileSync(codeGsPath, "utf8");

  const startMarker = "// CUSTOM_RULES_START";
  const endMarker = "// CUSTOM_RULES_END";

  const startIndex = codeGs.indexOf(startMarker);
  const endIndex = codeGs.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.error("Markers CUSTOM_RULES_START or CUSTOM_RULES_END not found in Code.gs!");
    process.exit(1);
  }

  const customRulesString = JSON.stringify(customRules, null, 2);
  const formattedRules = `  const CUSTOM_SHOP_RULES = ${customRulesString.replace(/\n/g, "\n  ")};`;

  const newCodeGs = 
    codeGs.slice(0, startIndex + startMarker.length) + 
    "\n" + 
    formattedRules + 
    "\n  " + 
    codeGs.slice(endIndex);

  fs.writeFileSync(codeGsPath, newCodeGs, "utf8");
  console.log("Successfully synchronized customRules.json to apps-script/Code.gs!");
}

sync();
