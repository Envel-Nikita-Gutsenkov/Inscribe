const fs = require("fs");
const path = require("path");
const https = require("https");

const fontsDir = path.join(__dirname, "..", "public", "fonts");
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  const fontIds = ["outfit", "plus-jakarta-sans"];
  let cssResult = "/* Locally Hosted Fonts */\n\n";

  for (const id of fontIds) {
    console.log(`Fetching metadata for font: ${id}...`);
    const data = await getJson(`https://google-webfonts-helper.herokuapp.com/api/fonts/${id}`);
    const variants = data.variants.filter(v => ["300", "400", "500", "600", "700"].includes(v.fontWeight) && v.fontStyle === "normal");
    
    for (const v of variants) {
      const woff2Url = v.woff2;
      if (!woff2Url) continue;
      
      const extension = ".woff2";
      const filename = `${id}-${v.fontWeight}${extension}`;
      const destPath = path.join(fontsDir, filename);
      
      console.log(`Downloading ${filename}...`);
      await downloadFile(woff2Url, destPath);
      
      cssResult += `@font-face {\n`;
      cssResult += `  font-family: '${data.name}';\n`;
      cssResult += `  font-style: normal;\n`;
      cssResult += `  font-weight: ${v.fontWeight};\n`;
      cssResult += `  font-display: swap;\n`;
      cssResult += `  src: url('/fonts/${filename}') format('woff2');\n`;
      cssResult += `}\n\n`;
    }
  }

  const cssPath = path.join(__dirname, "..", "src", "app", "globals.css");
  let cssContent = fs.readFileSync(cssPath, "utf8");
  
  // Strip any old local font declarations if they exist
  cssContent = cssContent.replace(/\/\* Locally Hosted Fonts \*\/[\s\S]*?(?=:root)/, "");
  
  // Insert new font declarations at the top
  fs.writeFileSync(cssPath, cssResult + cssContent, "utf8");
  console.log("Fonts downloaded and CSS updated successfully!");
}

run().catch(console.error);
