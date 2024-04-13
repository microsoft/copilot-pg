// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const util = require("./utils");
const PGChatComand =require("./lib/pg_chat_command");

let currentPrompt = null;
let cmd;
let chatStream;

function activate(context) {
  
  cmd = new PGChatComand();
  
  //register a variable so the user can change the connection
  vscode.chat.registerChatVariableResolver('conn', "The current db connection", {
    //this will pop a dialog
    resolve: cmd.getConn
  });

  const handler = async function (request, ctx, stream, token) {
    //holding on to the prompt so we can use it with the followup command
    currentPrompt = request.prompt;
    chatStream = stream;
    
    if(!request.prompt || request.prompt === ""){
      stream.markdown("Happy to help - what type of query do you want to run?")
    }else{
      await cmd.getConn();
      stream.markdown("Using connection `" + cmd.conn + "`. You can change this by adding #conn to the end of your prompt.\n");
      try {
        const hasChanges = await cmd.chatWithCopilot(request.prompt,token);
        //use some regex to squeeze out the code
        if(hasChanges) {
            stream.markdown("These SQL commands contain schema or data changes. Proceed?")
            stream.button({
              command: "pg.run",
              title: vscode.l10n.t('Yes, Execute!')
            });
            
          }else{
            await cmd.runResponse();
            vscode.window.showInformationMessage(`✨ Query executed successfully.`, "OK");
              //the followup to write a CSV
            chatStream.button({
              command: "pg.csv",
              title: vscode.l10n.t('Print the results as CSV')
            });
          }
        } catch(err){
          console.error(err)
          stream.markdown("\n\n🤔 Looks like that database doesn't exist or has no tables. Please check the connection again. You can set it by using #conn");
        }
     }
  }

  const dba = vscode.chat.createChatParticipant("dba.pg", handler);

  context.subscriptions.push(
    dba,
    vscode.commands.registerTextEditorCommand("pg.csv", async () => {
      //the json is cached already, just convert it and save
      let converter = require('json-2-csv');
      const csv = await converter.json2csv(cmd.results[0]);
      const fileName = util.sluggify(currentPrompt)
      util.writeToWorkspace("csvs",fileName + ".csv", csv, false);
      vscode.window.showInformationMessage(`✨ The results above have been written to csvs/${fileName} in your local project.`, "OK")
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
