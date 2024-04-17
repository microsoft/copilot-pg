const util = require("../utils");
const DB = require("../db");
const Participant = require("./participant");

class Postgres extends Participant {

  constructor(){
    super();
    this.db = null;
    this.conn=null;
    this.results = [];
    this.sqlCommands = [];
    //open the connection
    this.prompt="";
    this.systemPrompt = "You are a friendly database administrator and you have been asked to write a SQL query for a PostgreSQL database.";
    //register a ui variable
    this.variable("conn", "Set the connection string manually", this.setDb)
  }
  async connect(){
    let conn = util.getLocalEnvValue("DATABASE_URL");
    if(!conn){
      //ask for it
      conn = await this.inputBox("Which PostgreSQL database?", "postgres://localhost/chinook")
    }
    if(conn && conn !="") {
      this.setDb(conn);
      return true;
    } else {
      return false;
    }
  }
  async setDb(conn){
    this.conn = conn;
    if(this.db) this.db.close();
    this.db = new DB(conn);
  }
  async resultsToCsv(){
    const fileName = util.sluggify(this.lastPrompt)
    if(this.results.length === 0) return false;
    let converter = require('json-2-csv');
    const csv = await converter.json2csv(this.results[0]);
    util.writeToWorkspace("csvs",fileName + ".csv", csv, false);
    return fileName;
  }
  async chat(prompt, token, cb){
    //this will throw if there's no DB or the conn is bad
    //should be handled in calling code
    const schema = await this.db.buildSchema();
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
      await util.writeToTemp("results.json",JSON.stringify(results, null, 2))
    }
    return results;
  }

}
module.exports = Postgres;