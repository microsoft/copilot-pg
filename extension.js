// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const PG = require("./lib/pg");
const Editor = require("./lib/editor");

async function activate(context) {
  //this is our chat participant
  const pg = new PG();
  
  //wire up events coming from the participant
  pg.on("report", async function(){
    if(pg.outputFormat === "csv"){
      let converter = require('json-2-csv');
      const csv = await converter.json2csv(pg.queryResults);
      Editor.writeAndShowFile("results.csv", csv);
    }else{
      const json = JSON.stringify(pg.queryResults, null, 2);
      if(pg.queryResults.length === 0){
        vscode.window.showInformationMessage("Query executed successfully with no results");
      }else{
        Editor.writeAndShowFile("results.json", json);
      }
    }
  });

  //handle the query error by showing the SQL in a file.
  pg.on("query-error", async function(message){
    Editor.writeAndShowFile("query.sql", message);
  });
  
  //it's important to use an inline callback here due to scoping issues.
  //setting the handler to pg.handle would not work as "this" would not
  //be set right.
  const participant = vscode.chat.createChatParticipant("dba.pg", async (request, context, 
    stream, token) => {
    //Whenever a user hits enter, this is where we'll send the request
    await pg.handle(request, context, stream, token)
  });

  context.subscriptions.push(
    participant,
    vscode.commands.registerCommand("pg.print", async () => {
      const sql = pg.codeblocks.join("\n");
      let out = `/*
Edit the SQL below and click 'Run This' to execute the query. You can change the file as much as you like, and if there's an error, you'll see it here in the file
*/

`
      Editor.writeAndShowFile("query.sql", out + sql);
    }),
    //this is a little more code than I like to put in the extension.js file
    //however, these are all file interactions and I want to keep those
    //separate from the participant logic
    vscode.commands.registerCommand("pg.run", async () => {
      if(Editor.currentFileNameIs("query.sql")){
        //this is what we're going to run, replace our current command
        const sql = Editor.readCurrentEditor();
        if(sql){
          pg.codeblocks.length = 0;
          pg.codeblocks.push(sql);
        }
      }
      await pg.run();

    })
  );
}

// This method is called when your extension is deactivated
async function deactivate() {
  
}

module.exports = {
  activate,
  deactivate,
};
