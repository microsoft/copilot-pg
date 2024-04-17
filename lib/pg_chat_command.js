const util = require("./utils");
const DB = require("../db");

class PGChatCommand {

  constructor(chat, conn){
    this.conn = conn;
    this.results = [];
    this.sqlCommands = [];
    //open the connection
    this.db = new DB(conn);
    this.chat = chat;
    this.lastPrompt="";
    this.chat.systemPrompt = "You are a friendly database administrator and you have been asked to write a SQL query for a PostgreSQL database.";
  }

  async resultsToCsv(){
    const fileName = util.sluggify(this.lastPrompt)
    if(this.results.length === 0) return false;
    let converter = require('json-2-csv');
    const csv = await converter.json2csv(this.results[0]);
    util.writeToWorkspace("csvs",fileName + ".csv", csv, false);
    return fileName;
  }
  async chatWithCopilot(rawPrompt, token, cb){
    //this will throw if there's no DB or the conn is bad
    //should be handled in calling code
    this.lastPrompt = rawPrompt;
    const schema = await this.db.buildSchema();

    this.chat.queue(`Create a detailed query for a PostgreSQL database for ${rawPrompt}. The reference schema for this database is ${schema}.`);

    let md = "";
    const response = await this.chat.send(token, function(fragment){
      md += fragment;
      if(cb)cb(fragment);
    });
    for await (const fragment of response.stream) {
      md+=fragment;
      if(cb)cb(fragment)
    }
    const codeBlocks = util.getCodeFromChatResponse(md);
    let hasChanges = false;
    if(codeBlocks && codeBlocks.length > 0){
      for(let c of codeBlocks){
        if(!c.trim().toLowerCase().startsWith("select")){
          hasChanges = true;
        }
      }
    }
    //we want to hold this so they can be executed later
    this.sqlCommands = codeBlocks;
    return hasChanges;
  }
  async runResponse(){
    const {results, ascii} = await this.db.runCommands(this.sqlCommands);
    //hold on to results for printing
    this.results = results;
    if(results && results.length > 0){
      await util.writeToTemp("results.json",JSON.stringify(results, null, 2))
    }
    return ascii;
  }
  async setConn(conn){
    this.conn = conn;
    if(this.db) this.db.close();
    this.db = new DB(conn);
  }
}
module.exports = PGChatCommand;