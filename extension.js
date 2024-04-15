// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const util = require("./lib/utils");
//wraps the logic for this extension
const PGChatCommand = require("./lib/pg_chat_command");

//a helpful thing for working with VS Code and Copilot
const CopilotChat = require("./lib/copilot_chat");
let conn;
let cmd;
const getConn = async function(){
  conn = util.getLocalEnvValue("DATABASE_URL");
  if(!conn){
    //ask for it
    conn = await vscode.window.showInputBox({
      prompt: "Which PostgreSQL database?", 
      value: "postgres://localhost/red4"
    });
  }
  return conn;
}

function activate(context) {

  
  
  vscode.chat.registerChatVariableResolver("conn", "The current db connection", {
    //this will pop a dialog
    resolve: async function(){
      conn = await getConn();
      if(cmd) cmd.setConn(conn);
    }
  });
  
  const handler = async function (request, ctx, stream, token) {
    let chat = new CopilotChat();
    //If there's no prompt, just say hello
    if(!request.prompt || request.prompt === ""){
      stream.markdown("Happy to help - what type of query do you want to run?")
    }else{
      //initialize if there's no command already
      //this will create a prompt asking for the connection string
      if(!conn) await getConn();
      if(!cmd) cmd = new PGChatCommand(chat, conn);

      if(cmd){
        //make sure the user knows which DB we're working against
        stream.markdown("Using connection `" + cmd.conn + "`. You can change this by adding #conn to the end of your prompt.\n");
        const hasChanges = await cmd.chatWithCopilot(request.prompt,token);
        if(hasChanges) {
          //DO NOT automatically run update, create, delete, alter, etc
          stream.markdown("These SQL commands contain schema or data changes. Proceed?")
          stream.button({
            command: "pg.run",
            title: vscode.l10n.t('Yes, Execute!')
          });
          
        }else{
          //it's a select command
          await cmd.runResponse();
          vscode.window.showInformationMessage(`✨ Query executed successfully.`, "OK");
          
          //the followup to write a CSV
          stream.button({
            command: "pg.csv",
            title: vscode.l10n.t('Print the results as CSV')
          });
        }
      }else{
        stream.markdown("👎🏼 Can't run a command unless I have a connection string.")
      }
     }
  }

  const dba = vscode.chat.createChatParticipant("dba.pg", handler);

  context.subscriptions.push(
    dba,
    vscode.commands.registerTextEditorCommand("pg.csv", async () => {
      //the json is cached already, just convert it and save
      const fileName = await cmd.resultsToCsv(); 
      if(fileName){
        vscode.window.showInformationMessage(`✨ The results above have been written to csvs/${fileName} in your local project.`, "OK")
      }else{
        vscode.window.showInformationMessage("There are no results to show");
      }

    }),
    vscode.commands.registerTextEditorCommand("pg.run", async () => {
      //the json is cached already, just convert it and save
      try{
        await cmd.runResponse();
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
