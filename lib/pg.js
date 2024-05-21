const Participant = require("./participant");
const DB = require("./db");
const vscode = require("vscode");
const Command = require("./command");
const Editor = require("./editor");

class PG extends Participant{
  constructor(){
    super();
    //sets the contextual response for Copilot
    this.systemPrompt ="You are a friendly database administrator and you have been asked to write a SQL query for a PostgreSQL database.";
    this.db = null;
    this.conn = Editor.getDotEnvValue("DATABASE_URL") || "postgres://localhost/postgres";
    this.outputFormat = "json"
    //this is the fenced codeblock indicator we want
    //so we can run code
    this.codeTag = "sql";
    this.queryResults = [];

    //sets the connection and our database, but doesn't check if it's valid
    this.setDb();
    //the individual /commands, set below
    this.setCommands();

    //a callback called from Participant.handle
    this.formatPrompt = async function(prompt){
      let out = {prompt, error: null}
      try{
        const schema = await this.db.getSchema();
        out.prompt = `Create a detailed query for a PostgreSQL database for ${prompt}. The reference schema for this database is ${schema}. IMPORTANT: Be sure you only use the tables and columns from this schema`;
      }catch(err){
        //if we're here, the connection is incorrect or there's no schema.
        //ask for a new connection
        out.error = "🤔 I can't find the schema for the database. Please check the connection string with `/conn`";
      }
      
      return out;
    }
    //when the response comes back, we'll have some code to parse
    this.on("sent", ({stream}) => {
      if(this.codeblocks && this.codeblocks.length > 0){
        stream.markdown("\n\n💃 I can run these for you. Just click the button below");
        stream.button({
          command: "pg.run",
          title: vscode.l10n.t('Run This')
        });
        stream.button({
          command: "pg.print",
          title: vscode.l10n.t('Edit the SQL')
        });
      }
    });
  }

  setDb(){
    if(this.db) this.db.close();
    if(this.conn) this.db = new DB(this.conn);
  }

  async setCommands(){
    this.commands.out = Command.selectionCommand("out", ["json", "csv", "text"], (format) => {
      this.outputFormat = format;
      this.emit("report");
    });
    this.commands.schema = Command.createCommand("schema", async (request, stream) => {
      const schema = await this.db.getSchema();
      const prompt = `You are a savvy Postgres developer tasked with helping me create the tables and views for my database. Enhance the current schema with tables and views described by "${request.prompt.trim()}". Each table should have a primary key called 'id' that is serial primary key, and have created_at and updated_at filed that are timestamps defaulting to now. Each table and view should enhance and extend this schema: ${schema}`;
      await this.send(prompt, stream);
    });

    this.commands.conn = Command.inputCommand("conn", "Enter the connection string for the database", this.conn, (conn, stream) => {
      this.conn = conn;
      this.setDb();
      stream.markdown("🔗 Connection string set to `" + conn + "` .You can now run queries against the database");
    });
    this.commands.help = Command.showDocsCommand("help", "help.md");
    this.commands.show = Command.createCommand("show", async (request,stream) => {
      const prompt = request.prompt.trim();
      if(this.conn){
        try{
          let md = ["```json"];
          if(prompt === "tables" || prompt.trim() === ""){
            let tables = await this.db.getTableList();
            stream.markdown("Here are the tables in the database. You can ask for details about any table using `show [table]`.\n")
            tables.forEach(t => md.push(t.table_name));
            md.push("```");
            stream.markdown(md.join("\n"))
          }else{
            const table = await this.db.getTable(prompt);
            if(table){
              stream.markdown("Here are details for `" + prompt + "`\n");
              md.push(table);
              md.push("```");
              stream.markdown(md.join("\n"))
            }else{
              stream.markdown("🧐 Can't find the table `"+ prompt + "` \n")
            }
          }
        }catch(err){
          stream.markdown("\n\n🤷🏻‍♀️ This connection isn't valid `"+ this.conn + "`. Use `/conn` to check and reset the connection.")
        }

      }else{
        stream.markdown("🤔 Make sure the connection is set with `/conn` and you pass a table name");
      }
    });
    this.emit("commands-set");
  }

  //Run what we can, and if there's an error, return a SQL block
  //that can be shown to the user. I don't want file interactions in here,
  //only participant interactions, so boot this back to the extension.
  async run(){ 
    if(this.codeblocks.length === 0) return [];
    //let out= {results: [], error: null};
    try{
      this.queryResults.length = 0;
      for(let sql of this.codeblocks){
        //this will return either null or an array
        const res = await this.db.run(sql);
        if(res && res.length > 0){
          this.queryResults.push(res);
        }
      }
      if(this.queryResults.length === 1) this.queryResults = this.queryResults[0];
      this.emit("report");
      //out.results = queryResults;
    }catch(err){
      const sql = this.codeblocks.join("\n\n");
      const message = `/*
  Looks like there's a SQL problem: ${err.message}. 
  Copilot does its best but sometimes needs a little help!
  Try fixing the problem below and then save the file. Click the 'Run This' button to execute again.
  */
      
  ${sql}
  `;
      //out.error = message;
      this.emit("query-error", message);
    }
    
    //return out;
  }

}

module.exports = PG;