const Participant = require("./participant");
const util = require("./utils");
const DB = require("./db");
const vscode = require("vscode");


class PG extends Participant{
  constructor(){
    super();
    this.systemPrompt ="You are a friendly database administrator and you have been asked to write a SQL query for a PostgreSQL database.";
    this.db = null;
    this.conn = util.getLocalEnvValue("DATABASE_URL") || "postgres://localhost/postgres";
    this.outputFormat = "json"
    this.sqlCommands = [];
    this.queryResults = [];

    this.setDb();
    this.setCommands();
    this.addVariable("results", "The results of the last query in JSON format", {
      resolver: () => {
        if(this.queryResults && this.queryResults.length > 0){
          return JSON.stringify(this.queryResults, null, 2);
        }else{
          return "[]";
        }
      }
    });
    this.formatPrompt = async function(prompt){
      const schema = await this.db.getSchema();
      return `Create a detailed query for a PostgreSQL database for ${prompt}. The reference schema for this database is ${schema}. IMPORTANT: Be sure you only use the tables and columns from this schema`;
    }
    //when the response comes back, we'll have some code to parse
    this.parseResponse = async function(markdown, stream){
      this.sqlCommands = util.getCodeFromChatResponse(markdown);
      if(this.sqlCommands && this.sqlCommands.length > 0){
        stream.markdown("\n\n💃 I can run these for you. Just click the button below");
        stream.button({
          command: "pg.run",
          title: vscode.l10n.t('Run This')
        });
      }
    }
  }

  setDb(){
    if(this.db) this.db.close();
    if(this.conn) this.db = new DB(this.conn);
  }
  setCommands(){
    this.selectionCommand("out", ["json", "csv", "text"], (format) => {
      this.outputFormat = format;
    });
    this.inputCommand("conn", "Enter the connection string for the database", (conn) => {
      this.conn = conn;
      this.setDb();
    });
    this.showDocsCommand("help", "help.md");
    this.addCommand("show", async (request,stream) => {
      const prompt = request.prompt.trim();
      if(this.conn){
        let out = ["```json"];
        if(prompt === "tables" || prompt.trim() === ""){
          stream.markdown("Here are the tables in the database. You can ask for details about any table using `show [table]`.\n")
          let tables = await this.db.getTableList();
          tables.forEach(t => out.push(t.table_name));
          out.push("```");
          stream.markdown(out.join("\n"))
        }else{
          const table = await this.db.getTable(prompt);
          if(table){
            stream.markdown("Here are details for `" + prompt + "`\n");
            out.push(table);
            out.push("```");
            stream.markdown(out.join("\n"))
          }else{
            stream.markdown("🧐 Can't find the table `"+ prompt + "` \n")
          }
        }
      }else{
        stream.markdown("🤔 Make sure the connection is set with /conn and you pass a table name");
      }
    });
  }

  async run(){
    try{
      //is this a redo? It is if we have a query.sql file open
      const sql = util.readFile("temp/query.sql");
      if(sql && util.tempfileInEditor("query.sql")){
        this.sqlCommands.length = 0;
        this.sqlCommands.push(sql);
      }
      for(let sql of this.sqlCommands){
        this.queryResults.push(await this.db.run(sql));
      }
      if(this.queryResults && this.queryResults.length > 0){
        //outputs the results if there are any
        this.report();
      }else{
        vscode.window.showInformationMessage("🤙🏼 Query executed with no results", "OK")
      }
    }catch(err){
      const sql = this.sqlCommands.join("\n\n");
      const out = `/*
  Looks like there's a SQL problem: ${err.message}. 
  Copilot does its best but sometimes needs a little help!
  Try fixing the problem below and then save the file. Click the 'Run This' button to execute again.
  */
      
  ${sql}
  `;
  
      await util.writeToTemp("query.sql", out);
      //vscode.window.showInformationMessage("🤬 There was an error: " + err.message, "OK")
    }
  }
  async report(){
    if(this.queryResults.length > 0){
      //just do the last one, which is usually a select
      const out = this.queryResults[this.queryResults.length - 1];
      //I hate switch statements :p
      if(this.outputFormat === "json"){
        util.toJSON("results.json", out);
      }else if(this.outputFormat === "csv"){
        util.toCSV("results.csv", out);
      }else{
        util.toText("results.txt", out);
      }
    }
  }

  async handle(request, context, stream, token){
    const prompt = request.prompt.trim();
    const command = request.command;
    if(prompt === "" && !command){
      //there should always be a help command
      const command = this.commands.help;
      return command.handler(request, stream, token);
    }else{
      const command = this.commands[request.command];
      if(command){
        return command.handler(request, stream, token);
      }else{
        //is there a prompt? If not, show help
        const prompt = await this.formatPrompt(request.prompt);
        return this.send(prompt, stream, token);
      }
    }
  }
}

module.exports = PG;