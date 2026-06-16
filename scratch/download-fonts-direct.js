const fs = require("fs");
const path = require("path");
const https = require("https");

const fontsDir = path.join(__dirname, "..", "public", "fonts");
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

function getCss() {
  const url = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap";
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(data));
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
  console.log("Fetching Google Fonts stylesheet...");
  const css = await getCss();
  
  // Find all font face matches
  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
  let match;
  let localCss = "/* Locally Hosted Fonts */\n\n";
  let count = 0;

  // We want to extract font-family, font-weight, and url()
  while ((match = fontFaceRegex.exec(css)) !== null) {
    const block = match[1];
    
    const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)['"]?/);
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const urlMatch = block.match(/url\((https:[^)]+)\)/);
    
    if (familyMatch && weightMatch && urlMatch) {
      const family = familyMatch[1];
      const weight = weightMatch[1];
      const url = urlMatch[1];
      
      const cleanFamilyName = family.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const filename = `${cleanFamilyName}-${weight}.woff2`;
      const destPath = path.join(fontsDir, filename);
      
      console.log(`Downloading ${filename} from Google servers...`);
      await downloadFile(url, destPath);
      
      localCss += `@font-face {\n`;
      localCss += `  font-family: '${family}';\n`;
      localCss += `  font-style: normal;\n`;
      localCss += `  font-weight: ${weight};\n`;
      localCss += `  font-display: swap;\n`;
      localCss += `  src: url('/fonts/${filename}') format('woff2');\n`;
      localCss += `}\n\n`;
      count++;
    }
  }

  const cssPath = path.join(__dirname, "..", "src", "app", "globals.css");
  let cssContent = fs.readFileSync(cssPath, "utf8");
  
  // Strip any old local font declarations
  cssContent = cssContent.replace(/\/\* Locally Hosted Fonts \*\/[\s\S]*?(?=:root)/, "");
  
  // Update globals.css to restore the original font stack names
  cssContent = cssContent.replace(
    /--font-sans: [^;]+;/,
    "--font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;"
  );
  cssContent = cssContent.replace(
    /--font-display: [^;]+;/,
    "--font-display: 'Outfit', system-ui, -apple-system, sans-serif;"
  );

  fs.writeFileSync(cssPath, localCss + cssContent, "utf8");
  console.log(`Successfully downloaded ${count} local font files and updated CSS!`);
}

run().catch(console.error);
