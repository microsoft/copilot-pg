const util = require("../utils");
const Participant = require("./participant");
const DB = require("../db");

class PG extends Participant {

  constructor(){
    super();
    this.db = null;
    this.conn = util.getLocalEnvValue("DATABASE_URL");;
    if(this.conn) this.setDb();
    this.results = [];
    this.sqlCommands = [];
    this.systemPrompt = "You are a friendly database administrator and you have been asked to write a SQL query for a PostgreSQL database.";

  }

  handleRequest(request, stream, token){
    const prompt = request.prompt.trim();

  }
  execChat(prompt){

  }
  async setOutput(){
    this.outputFormat = await this.selectionBox(["json", "csv","text]"]);
  }

  async setDb(){
    if(this.db){
      await this.db.close();
    }
    this.db = new DB(this.conn);
  }

  async chat(prompt, token, cb){
    //this will throw if there's no DB or the conn is bad
    //should be handled in calling code
    const schema = await this.db.buildSchema();
    
    //remember this, unless we've already run it
    if(this.history.indexOf(prompt) < 0) this.history.push(prompt);
    
    this.userPrompt=prompt;
    
    this.prompt = `Create a detailed query for a PostgreSQL database for ${prompt}. The reference schema for this database is ${schema}. IMPORTANT: Be sure you only use the tables and columns from this schema`;
   
    let md = "";
    const response = await this.send(this.prompt, token);
    for await (const fragment of response.stream) {
      md+=fragment;
      if(cb)cb(fragment)
    }
    this.sqlCommands = util.getCodeFromChatResponse(md);
    return true;
  }
  async report(){
    if(this.results.length > 0){
      //I hate switch statements :p
      if(this.outputFormat === "json"){
        util.toJSON(this.userPrompt,this.results);
      }else if(this.outputFormat === "csv"){
        util.toCSV(this.userPrompt,this.results);
      }else{
        util.toText(this.userPrompt,this.results);
      }
    }
  }
  async run(){
    const res = [];
    for(let sql of this.sqlCommands){
      //NEVER run a DROP statement
      if(sql.toLowerCase().indexOf("drop database") >=0 || sql.toLowerCase().indexOf("drop table") >=0 ){
        throw new Error("👎🏼 not running a drop statement. If that's what you want, you'll need to do it outside this chat session.")
      }else{
        const rows = await this.db.run(sql);
        if(rows && rows.length > 0){
          //if there are results, let's show them!
          //turn the JSON into an ASCII table and then pop it in the editor window
          res.push(rows)
        }
      }
    }
    if(res.length > 0){
      this.results=res[res.length-1]
    }
    return this.results;
  }


}
module.exports = PG;