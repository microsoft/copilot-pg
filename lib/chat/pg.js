const util = require("../utils");
const DB = require("../db");
const Participant = require("./participant");

class PG extends Participant {

  constructor(){
    super();
    this.db = null;
    this.conn=null;
    this.results = [];
    this.sqlCommands = [];
    //open the connection
    
    this.systemPrompt = "You are a friendly database administrator and you have been asked to write a SQL query for a PostgreSQL database.";
  }
  async connect(){
    //if we have a connection already, keep it
    if(this.conn) return true;
    this.conn = util.getLocalEnvValue("DATABASE_URL");
    if(!this.conn){
      //ask for it
      this.conn = await this.inputBox("Which PostgreSQL database?", "postgres://localhost/chinook")
    }

    this.setDb();
     
    return this.conn !== null;
  }
  async setOutput(){
    this.outputFormat = await this.selectionBox(["json", "csv","text]"]);
  }
  getTableList(){
    return this.db.getTables();
  }
  async setDb(){
    if(this.db) this.db.close();
    this.db = new DB(this.conn);
  }

  async chat(prompt, token, cb){
    //this will throw if there's no DB or the conn is bad
    //should be handled in calling code
    const schema = await this.db.buildSchema();
    this.userPrompt=prompt;
    this.prompt = `Create a detailed query for a PostgreSQL database for ${prompt}. The reference schema for this database is ${schema}.`;
   
    let md = "";
    const response = await this.send(prompt, token);
    for await (const fragment of response.stream) {
      md+=fragment;
      if(cb)cb(fragment)
    }
    this.sqlCommands = util.getCodeFromChatResponse(md);
    return true;
  }
  async run(){

    const {results} = await this.db.runCommands(this.sqlCommands);

    if(results && results.length > 0){
      this.results = results;
      //I hate switch statements :p
      if(this.outputFormat === "json"){
        this.toJSON();
      }else if(this.outputFormat === "csv"){
        this.toCSV();
      }else{
        this.toText();
      }
    }
    return results;
  }
  async toCSV(){
    const fileName = util.sluggify(this.userPrompt)
    if(this.results.length === 0) return false;
    let converter = require('json-2-csv');
    const csv = await converter.json2csv(this.results[0]);
    //util.writeToWorkspace("csvs",fileName + ".csv", csv, false);
    util.writeToTemp(`${fileName}.csv`, csv)
    return fileName;
  }
  
  toJSON(){
    const fileName = util.sluggify(this.userPrompt)
    util.writeToTemp(`${fileName}.json`,JSON.stringify(this.results, null, 2))
  }
  //this doesn't seem to work consistently
  toText(){
    const fileName = util.sluggify(this.userPrompt);
    const ascii = util.jsonToAscii(this.userPrompt, this.results);
    util.writeToTemp(`${fileName}.txt`,ascii)
  }

}
module.exports = PG;