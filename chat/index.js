const fs = require("fs");
const path = require("path");
const thisDir = vscode.workspace.workspaceFolders[0].uri.path;
const envFile = path.resolve(thisDir, ".env");

const vscode = require("vscode");
exports.getConnection = async function(){
  let conn = "";
  if (!fs.existsSync(envFile)) {
    conn = await vscode.window.showInputBox({
      placeHolder: "Connection String",
      prompt: "postgres://user:pw@server:port/db"
    })
  }else{
    const env = require("dotenv").config({ path: `${envFile}` });
    conn = env.parsed.DATABASE_URL;
  }
  return conn;
}