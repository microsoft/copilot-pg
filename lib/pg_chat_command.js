const vscode = require("vscode");
const util = require("../utils");
const fs = require("fs");
const path = require("path");

class PGChatCommand {

  constructor(){
    this.messages = [
      new vscode.LanguageModelChatSystemMessage("You are a friendly database administrator and you have been asked to write a SQL query for a PostgreSQL database.")
    ]
    this.workingDir = vscode.workspace.workspaceFolders[0].uri.path;
    this.envFile = path.resolve(this.workingDir, ".env");
    this.getConn();
  }

  getConn(){
    if(!this.conn){
      //a few choices here - we can default to the local .ENV
      if (fs.existsSync(this.envFile)) {
        const env = require("dotenv").config({ path: `${this.envFile}` });
        this.conn = env.parsed.DATABASE_URL;
      }
      if(!this.conn){
        const result = vscode.window.showInputBox({
            prompt: 'Enter the URL to the PostgreSQL database you want to work with. You can change this at any time using #conn.',
            value: "postgres://localhost/postgres"
        }) || "";
        if (result.trim() !== '') {
          this.conn = result;
        }
      }
    }
  }
}