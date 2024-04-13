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
}

function activate(context) {

  vscode.chat.registerChatVariableResolver('conn', "The current db connection", {
    resolve: async (name, context, token) => {
      if (name === 'conn') {
  
        // prompt the user for a url using the vscode.window.showInputBox API
        const result = await vscode.window.showInputBox({
            prompt: 'Enter the URL to the PostgreSQL database you want to work with',
            value: "postgres://localhost/??"
        }) || "";
  
        if (result.trim() !== '') {
          conn = result;
        }
      }
    }
  });
  const getConn = async function(){
    if(conn) return conn;
    //a few choices here - we can default to the local .ENV
    if (fs.existsSync(envFile)) {
      const env = require("dotenv").config({ path: `${envFile}` });
      conn = env.parsed.DATABASE_URL;
    }
    if(!conn){
      const result = await vscode.window.showInputBox({
          prompt: 'Enter the URL to the PostgreSQL database you want to work with. You can change this at any time using #conn.',
          value: "postgres://localhost/postgres"
      }) || "";
      if (result.trim() !== '') {
        conn = result;
      }
    }
    //if we don't have a connection, we can ask for one

  }
  const handler = async function (request, ctx, stream, token) {
    //holding on to the prompt so we can use it with the followup command
    currentPrompt = request.prompt;
    chatStream = stream;
    await getConn();
    stream.markdown("Using connection `" + conn + "`. You can change this by adding #conn to the end of your prompt.\n");
    db = new DB(conn);
    let schema;
    let haveError = false;
    try{
      schema = await db.buildSchema();
    }catch(err){
      haveError = true;
    }
    if(!request.prompt || request.prompt === ""){
      stream.markdown("Happy to help - what type of query do you want to run?")
      haveError = true;
    }
    if(haveError){
      stream.markdown("\n\n🤔 Looks like that database doesn't exist or has no tables. Please check the connection again. You can set it by using #conn").
      return
    }else{
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
    }
  };


  const dba = vscode.chat.createChatParticipant("dba.pg", handler);
  
  //might be interesting at some point
  // dba.followupProvider = {
  //   provideFollowups(result, context, token){
  //       return [{
  //           prompt: 'Explain this query?',
  //           label: vscode.l10n.t('Explain this query?'),
  //           command: 'explain'
  //       }];
  //   }
  // };

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
    })
  );
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
