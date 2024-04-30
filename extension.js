// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const PG = require("./lib/pg");
const Editor = require("./lib/editor");

async function activate(context) {

  //this is our chat participant
  const pg = new PG();

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
      const {results, error} = await pg.run();
      if(error){
        Editor.writeAndShowFile("query.sql", error);
      }else{
        if(this.outputFormat === "csv"){
          let converter = require('json-2-csv');
          const csv = await converter.json2csv(results);
          Editor.writeAndShowFile("results.csv", csv);
        }else{
          const json = JSON.stringify(results, null, 2);
          Editor.writeAndShowFile("results.json", json);
        }
      }

    })
  );
}

// This method is called when your extension is deactivated
async function deactivate() {
  //delete temp files
  await util.clearTemp();
}

module.exports = {
  activate,
  deactivate,
};
