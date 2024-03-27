// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
//const LANGUAGE_MODEL_ID = "copilot-gpt-4"; // a lot slower than below
const LANGUAGE_MODEL_ID = "copilot-gpt-3.5-turbo";
const fs = require("fs");
const path = require("path");
const thisDir = vscode.workspace.workspaceFolders[0].uri.path;
const envFile = path.resolve(thisDir, ".env");
const pgp = require("pg-promise")({});
const util = require("./utils");
let currentResult = null;
let currentPrompt = null;

//this writes a file to the *extension* temp directory
//so we can display it, but not intrude on the user's workspace
const writeToTemp = async function(fileName, val){
  //pop this in the extension temp
  const filePath = path.resolve(__dirname,fileName);
  fs.writeFileSync(filePath, val, "utf-8");
  var openPath = vscode.Uri.file(filePath);
  const openDoc = await vscode.workspace.openTextDocument(openPath);
  await vscode.window.showTextDocument(openDoc);
}

//Some duplication here, I'll refactor as I can. This writes a file to the workspace
//and optionally shows it in the editor
const writeToWorkspace = async function(dir, fileName, val, showDoc = true){
  //pop this in the extension temp
  const outDir = path.resolve(thisDir, dir);
  if(!fs.existsSync(outDir)){
    fs.mkdirSync(outDir);
  }
  const filePath = path.resolve(outDir,fileName);
  fs.writeFileSync(filePath, val, "utf-8");
  if(showDoc){
    var openPath = vscode.Uri.file(filePath);
    const openDoc = await vscode.workspace.openTextDocument(openPath);
    await vscode.window.showTextDocument(openDoc);
  }
}

function activate(context) {

  const handler = async function (request, ctx, stream, token) {
    //holding on to the prompt so we can use it with the followup command
    currentPrompt = request.prompt;

    if (request.command === "query") {
      //TODO: this is how we know what DB to connect to. We should have a way to make this
      //more customizable either through an alternate .env file, or by manual setting
      if (!fs.existsSync(envFile)) {
        stream.markdown("Please be sure there's a .env file in the root of the project with a DATABASE_URL setting");
        return;
      }
      //Pull out the settings directly using dotenv
      const env = require("dotenv").config({ path: `${envFile}` });
      const conn = env.parsed.DATABASE_URL;
      if (!conn) {
        stream.markdown("Please be sure there's a DATABASE_URL='' setting in your .env");
      }
      const db = pgp(conn);
      
      //This query interrogates our DB for tables and their columns. It's ANSI SQL so should work
      //with any provider
      let sql = `SELECT table_name, column_name, data_type, character_maximum_length, column_default, is_nullable
      FROM information_schema.columns
      where table_schema = 'public';`;

      const res = await db.manyOrNone(sql);

      //returns a bunch of 'create table' statements so we can send to Copilot
      const schema = util.jsonToDDL(res);

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
        //we should only have one SQL reply, so take the first
        //this works 90%+
        const sql = matches[0];
        
        //use this to execute the query. If it errors, we'll see the message
        //from Copilot
        const rows = await db.manyOrNone(sql);
        await db.$pool.end();

        if(rows && rows.length > 0){
          //cache results for CSV output
          currentResult = rows;
          
          //turn the JSON into an ASCII table and then pop it in the editor window
          const ascii = util.jsonToAscii(request.prompt, rows);
          await writeToTemp("results.txt",ascii)

          stream.markdown("\n\n The results are to the right... hope this helps");

          //the followup to write a CSV
          stream.button({
            command: "pg.csv",
            title: vscode.l10n.t('Print the results as CSV')
          });
          
        }else{
          stream.markdown("No results for this query");
        }

      } else {
        stream.markdown("\n\n No query to run... taking a nap");
      }
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
      writeToWorkspace("csvs",fileName + ".csv", csv, false);
      const res = vscode.window.showInformationMessage(`✨ The results above have been written to csvs/${fileName} in your local project.`, "OK")
      if(res === "OK"){
        
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
