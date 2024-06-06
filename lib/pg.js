const Participant = require("./participant");
const DB = require("./db");
const vscode = require("vscode");
const Command = require("./command");
const Editor = require("./editor");

class PG extends Participant{
  constructor(){
    super();
    //sets the contextual response for Copilot
    this.systemPrompt ="You are a friendly database administrator and you have been asked to help write SQL for a PostgreSQL database.";
    this.db = null;
    this.conn = Editor.getDotEnvValue("DATABASE_URL") || "postgres://localhost/postgres";
    this.outputFormat = "json"
    //this is the fenced codeblock indicator we want
    //so we can run code
    this.codeTag = "sql";
    this.queryResults = [];
    this.error = "";
    this.errorQuery = "";
    //sets the connection and our database, but doesn't check if it's valid
    this.setDb(); 
    //the individual /commands, set below
    this.setCommands();

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
  async defaultResponse(request, stream){
    try{
      const schema = await this.db.getSchema();
      const prompt = `Please provide help with ${request.prompt}. The reference database schema for question is ${schema}. IMPORTANT: Be sure you only use the tables and columns from this schema in your answer.`;
      await this.send(prompt, stream);
    }catch(err){
      stream.markdown("🤔 I can't find the schema for the database. Please check the connection string with `/conn`");
    }
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
    this.commands.fix = Command.createCommand("fix", async (request, stream) => {
      if(this.error && this.errorQuery){
        const schema = await this.db.getSchema();
        const prompt = `I have a problem with this query: ${this.errorQuery} and the exact error is ${this.error}. How can I fix this for PostgreSQL? Be as complete as you can and make sure your answer complies with the schema: ${schema}`;
        await this.send(prompt, stream);
        this.emit("sent", {stream})
      }else{
        stream.markdown("🤔 I don't have an error to fix. Run some SQL first!");
      }

    });
    this.commands.schema = Command.createCommand("schema", async (request, stream) => {
      const schema = await this.db.getSchema();
      const prompt = `You are a savvy Postgres developer tasked with helping me create the tables and views for my database. Enhance the current schema with tables and views described by "${request.prompt.trim()}". Each table should have a primary key called 'id' that is serial primary key, and have created_at and updated_at filed that are timestamps defaulting to now in the current time zone. Each table and view should enhance and extend this schema: ${schema}`;
      await this.send(prompt, stream);
      this.emit("sent", {stream})
    });

    this.commands.conn = Command.createCommand("conn", async(request, stream) => {
      
      const prompt = request.prompt.trim();
      if(prompt.length > 0){
        
        if(prompt.startsWith("postgres://") || prompt.startsWith("postgresql://")){
          this.conn = prompt;
        }else{
          this.conn = `postgres://localhost/${prompt}`;
        }
        this.setDb();
        stream.markdown("🔗 Connection string set to `" + this.conn + "` .You can now run queries against the database");
      }else{
        stream.markdown("🔗 The current connection is `" + this.conn + "` . You can change it by appending the new connection after /conn. Tip: you can use the name of the database only to connect to your local service. Otherwise, use a full URL like `postgres://localhost/mydb`");
      }

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
          console.log("ERROR", err);
          stream.markdown("\n\n🤷🏻‍♀️ There is a problem connecting to the database using `"+ this.conn + "`. This could be due to a connection issue, or that you don't have permission to query the tables. You can change the connection using `/conn.`")
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
      //save the error for use with /fix
      const sql = this.codeblocks.join("\n\n");
      this.error = err.message;
      this.errorQuery = sql;
      const message = `/*
  Looks like there's a SQL problem: ${err.message}. 
  Copilot does its best but sometimes needs a little help!
  You can fix the problem on your own, or try @pg /fix to see what Copilot has to say. Click the 'Run This' button to execute again.
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