const vscode = require("vscode");
const util = require("../utils");
const fs = require("fs");
const path = require("path");
const DB = require("../db");

class PGChatCommand {

  constructor(modelId="copilot-gpt-3.5-turbo"){
    this.modelId = modelId;
    this.results = [];
    this.sqlCommands = [];
  }

  async getConn(){
    if(!this.conn){
      //a few choices here - we can default to the local .ENV
      if (fs.existsSync(this.envFile)) {
        const workingDir = vscode.workspace.workspaceFolders[0].uri.path;
        const envFile = path.resolve(workingDir, ".env");
        const env = require("dotenv").config({ path: `${envFile}` });
        this.conn = env.parsed.DATABASE_URL;
      }
      if(!this.conn){
        const result = await vscode.window.showInputBox({
            prompt: 'Enter the URL to the PostgreSQL database you want to work with. You can change this at any time using #conn.',
            value: "postgres://localhost/postgres"
        }) || "";
        if (result.trim() !== '') {
          this.conn = result;
        }
      }
      if(this.conn){
        this.db = new DB(this.conn);
      }
    }
  }

  async chatWithCopilot(rawPrompt, token, cb){
    //this will throw if there's no DB or the conn is bad
    //should be handled in calling code
    const schema = await this.db.buildSchema();

    const prompt = `Create a detailed query for a PostgreSQL database for ${rawPrompt}. The reference schema for this database is ${schema}.`;
    const messages = [
      new vscode.LanguageModelChatSystemMessage("You are a friendly database administrator and you have been asked to write a SQL query for a PostgreSQL database."),
      new vscode.LanguageModelChatUserMessage(prompt)
    ]
    const chatResponse = await vscode.lm.sendChatRequest(
      this.modelId,
      messages,
      {},
      token
    );
    let md = "";
    for await (const fragment of chatResponse.stream) {
      //the code is always in markdown, so trigger recording the code
      //when ticks come in.
      if(cb)cb(fragment)
      md += fragment;
    }
    return this.parseResponse(md);
  }
  async runResponse(){
    const {results, ascii} = await this.db.runCommands(this.sqlCommands);
    this.results = results;
    if(results && results.length > 0){
      await util.writeToTemp("results.txt",results)
    }
    this.db.close();
    return ascii;
  }
  parseResponse(streamText){
    const codePattern = /(?<=```sql).+?(?=```)/gs;
    this.sqlCommands = streamText.match(codePattern);
    for(let c of matches){
      if(!c.trim().toLowerCase().startsWith("select")){
        return true;
      }
    }
    return false;
  }
}
module.exports = PGChatCommand;