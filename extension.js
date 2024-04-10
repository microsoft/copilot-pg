// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
//const LANGUAGE_MODEL_ID = "copilot-gpt-4"; // a lot slower than below
const LANGUAGE_MODEL_ID = "copilot-gpt-3.5-turbo";
const fs = require("fs");
const path = require("path");
const thisDir = vscode.workspace.workspaceFolders[0].uri.path;
const envFile = path.resolve(thisDir, ".env");
const DB = require("./db");
const util = require("./utils");

let currentResult = null;
let currentPrompt = null;
let sqlCommands = [];
let conn = "";
let db;
let chatStream;


const showResults = async function(results){
  if(results && results.length > 0){
    await util.writeToTemp("results.txt",results)
  }else{
    vscode.window.showInformationMessage(`✨ Query executed successfully.`, "OK");
  }
  
  //chatStream.markdown("\n\n The results are to the right... hope this helps");
}

function activate(context) {

  const handler = async function (request, ctx, stream, token) {
    //holding on to the prompt so we can use it with the followup command
    currentPrompt = request.prompt;
    chatStream = stream;

    if(request.command === "conn"){
      conn = request.prompt;
      stream.markdown("Connection set. Let's goooo!")
    }else if (request.command === "query") {
      //TODO: this is how we know what DB to connect to. We should have a way to make this
      //more customizable either through an alternate .env file, or by manual setting

      //Still might be null or empty
      if (!conn) {
        if (fs.existsSync(envFile)) {
          const env = require("dotenv").config({ path: `${envFile}` });
          conn = env.parsed.DATABASE_URL;
        }
        if(!conn){
          stream.markdown("There's no .env file with a DATABASE_URL. Please set the connection using the /conn command");        
          return;
        }
      }
      
      db = new DB(conn);
      const schema = await db.buildSchema();

      stream.progress("Right then, let's see what we can find...");
      const prompt = `Create a select query for a PostgreSQL database for ${request.prompt}. The reference schema for this database is ${schema}.`;

      const messages = [
        new vscode.LanguageModelChatSystemMessage("You are a friendly database administrator and you have been asked to write a SQL query for a PostgreSQL database."),
        new vscode.LanguageModelChatUserMessage(prompt),
      ];

      const chatResponse = await vscode.lm.sendChatRequest(
        LANGUAGE_MODEL_ID,
        messages,
        {},
        token
      );
      let md = "";
      for await (const fragment of chatResponse.stream) {
        //the code is always in markdown, so trigger recording the code
        //when ticks come in.
        stream.markdown(fragment);
        md += fragment;
      }
      //use some regex to squeeze out the code
      const codePattern = /(?<=```sql).+?(?=```)/gs;
      const matches = md.match(codePattern);

      if (matches && matches.length > 0) {
        
        //cache this
        sqlCommands = matches;

        //right now this just looks for the presence of a select query
        const hasChanges = db.hasChanges(sqlCommands);
        if(hasChanges){
          stream.markdown("These SQL commands contain schema or data changes. Proceed?")
          stream.button({
            command: "pg.run",
            title: vscode.l10n.t('Yes, Execute!')
          });
          
        }else{
          const {results, ascii} = await db.runCommands(matches);
          await showResults(ascii);
          currentResult = results;
            //the followup to write a CSV
          chatStream.button({
            command: "pg.csv",
            title: vscode.l10n.t('Print the results as CSV')
          });
        }
        await db.close();

        
      }
    }else{
      stream.markdown(request.prompt)
    }
  };
  const dba = vscode.chat.createChatParticipant("dba.pg", handler);
  dba.isSticky = true;
  context.subscriptions.push(
    dba,
    vscode.commands.registerTextEditorCommand("pg.csv", async (editor) => {
      //the json is cached already, just convert it and save
      let converter = require('json-2-csv');
      const csv = await converter.json2csv(currentResult);
      const fileName = util.sluggify(currentPrompt)
      util.writeToWorkspace("csvs",fileName + ".csv", csv, false);
      vscode.window.showInformationMessage(`✨ The results above have been written to csvs/${fileName} in your local project.`, "OK")
    }),
    vscode.commands.registerTextEditorCommand("pg.run", async (editor) => {
      //the json is cached already, just convert it and save
      try{
        const {results, ascii} = await db.runCommands(sqlCommands);
        currentResult = results;
        showResults(ascii)
      }catch(err){
        vscode.showInformationMessage("🤬 There was an error:", err.message)
      }
    }),
    vscode.chat.registerChatVariableResolver('pg_results', "The results of the last query", (name, context, token) => {
      if(!currentResult){
        currentResult="--"
      }
      return {
        level: vscode.ChatVariableLevel.Full,
        value: currentResult
      }
    }),
    vscode.chat.registerChatVariableResolver('pg_conn', "The current db connection", (name, context, token) => {
      if(!conn){
        conn="--"
      }
      return {
        level: vscode.ChatVariableLevel.Medium,
        value: conn
      }
    })
  );
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
