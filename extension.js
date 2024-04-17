// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
//wraps the logic for this extension
const {PostgresParticipant} = require("./lib/chat");

//a helpful thing for working with VS Code and Copilot

let currentStream;


function activate(context) {
  const pg = new PostgresParticipant();
  
  const handler = async function (request, ctx, stream, token) {
    //setting this here so we can use in callbacks. Will refactor this
    //at some point.
    currentStream = stream;

    //If there's no prompt, just say hello
    if(!request.prompt || request.prompt === ""){
      stream.markdown("👋🏻 Happy to help - what type of query do you want to run?\n")
    }else{
      //stream.progress("Connecting...")
      stream.progress("Conecting to Postgres. Looking in .env for `DATABASE_URL`, if none found, will ask you for one.")
      const connected = await pg.connect();
      if(connected){
        stream.markdown("\n\n🐯 Connected to `" + pg.conn + "`");
        stream.progress("👨🏻‍🎤 Talking to Copilot...");
        await pg.chat(request.prompt, token, function(fragment){
          stream.markdown(fragment)
        });
        stream.markdown("\n\n💃 I can run these for you. Just click the button below");
        stream.button({
          command: "pg.run",
          title: vscode.l10n.t('👍🏼 Yes, Run This')
        });
      }else{
        stream.markdown("🧐 Can't do much without a connection.")
      }
    }
  }
  

  const dba = vscode.chat.createChatParticipant("dba.pg", handler);

  context.subscriptions.push(
    dba,
    vscode.commands.registerTextEditorCommand("pg.csv", async () => {
      //the json is cached already, just convert it and save
      // const fileName = await cmd.resultsToCsv(); 
      // if(fileName){
        //vscode.window.showInformationMessage(`✨ The results above have been written to csvs/${fileName} in your local project.`, "OK")
      // }else{
      //   vscode.window.showInformationMessage("There are no results to show");
      // }

    }),
    vscode.commands.registerTextEditorCommand("pg.run", async () => {
      //the json is cached already, just convert it and save
      try{
        //await cmd.runResponse();
        vscode.window.showInformationMessage("🤙🏼 Changes made");
      }catch(err){
        vscode.window.showInformationMessage("🤬 There was an error:", err.message)
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
