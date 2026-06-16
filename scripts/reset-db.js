const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        try {
          fs.unlinkSync(curPath);
        } catch (err) {
          console.warn(`Could not delete file ${curPath}: ${err.message}`);
        }
      }
    });
    try {
      fs.rmdirSync(folderPath);
    } catch (err) {
      console.warn(`Could not delete folder ${folderPath}: ${err.message}`);
    }
  }
}

console.log("Resetting database and development data...");

// Delete sqlite DB files
const dbFiles = ["db.sqlite", "db.sqlite-wal", "db.sqlite-shm"];
dbFiles.forEach((file) => {
  const filePath = path.join(DATA_DIR, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted ${file}`);
    } catch (err) {
      console.warn(`Could not delete ${file}: ${err.message}. If the server is running, please stop it first.`);
    }
  }
});

// Delete backups and snapshots
deleteFolderRecursive(path.join(DATA_DIR, "backups"));
deleteFolderRecursive(path.join(DATA_DIR, "snapshots"));

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log("Database reset complete. Please restart the dev server to initialize a fresh database.");
