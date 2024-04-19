// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const util = require("./lib/utils");
//wraps the logic for this extension
const {PostgresParticipant} = require("./lib/chat");
let tables = [];
//a helpful thing for working with VS Code and Copilot

function activate(context) {

  const pg = new PostgresParticipant();
  vscode.chat.registerChatVariableResolver("connection", "The current connection string", {
    //this will pop a dialog
    resolve: function(){
      return pg.conn;
    }
  });
  vscode.chat.registerChatVariableResolver("tables", "A list of tables", {
    //this will pop a dialog
    resolve: function(){
      return tables;
    }
  });
  vscode.chat.registerChatVariableResolver("results", "The results of the last query in JSON format", {
    //this will pop a dialog
    resolve: function(){
      if(pg.results && pg.results.length > 0){
        return JSON.stringify(pg.results, null, 2);
      }else{
        return "[]";
      }
    }
  });

  const handler = async function (request, ctx, stream, token) {
    const prompt = request.prompt.trim();
    //set the output format
    switch(request.command){
      case "out":
        const picks = ["json","csv", "text"];
        if(picks.indexOf(prompt) >=0 ){
          pg.outputFormat = prompt;
        }else{
          pg.outputFormat = await vscode.window.showQuickPick(picks);
        }
        stream.markdown("🤙🏼 Output format set to `"  + pg.outputFormat + "`");
        await pg.report();
        break;
      case "help":
        stream.markdown(util.readFile("HELP.md"));
        break;
      case "tables":
        if(pg.conn){
          let out = ["```json"];
          tables = await pg.getTableList();
          tables.forEach(t => out.push(t.table_name))
          out.push("```");
          stream.markdown(out.join("\n"));
        }else{
          stream.markdown("🤔 Set the database connection first using /conn");
        }
        break;
      case "show":
        if(pg.conn && prompt.length > 0){
          const table = await pg.showTable(prompt);
          
          if(table){
            let out = [];
            out.push("Here are the details for "+ prompt);
            out.push("```json");
            out.push(table);
            out.push("```");
            stream.markdown(out.join("\n"));
          }else{
            stream.markdown("🧐 Can't find the table `"+ prompt + "`")
          }

        }else{
          stream.markdown("🤔 Make sure the connection is set with /conn and you pass a table name");
        }
        break;
      case "conn": 
        //allow for passing in of DB name for local servers
        //if we have a prompt and there are no spaces...
        if(prompt.length > 0 && prompt.indexOf(" ") < 0){
          pg.conn = `postgres://localhost/${prompt}`;
        }else{
          stream.progress("Setting the connection. Pop it in the box at the top of the editor...")
          pg.conn = await vscode.window.showInputBox({
            prompt: "Which database?",
            value: "postgres://localhost/chinook"
          });
        }
        pg.setDb();
        stream.markdown("🤙🏼 Connection set to `"  + pg.conn + "`");
        break;
      default:
        stream.progress("Connecting to Postgres. Looking in .env for `DATABASE_URL`, if none found, will ask you for one.")
        //const connected = await pg.connect();
        if(pg.conn && prompt.length > 0){
          stream.markdown("🐯 Connected to `" + pg.conn + "`");
          stream.progress("👨🏻‍🎤 Talking to Copilot...");
          await pg.chat(request.prompt, token, function(fragment){
            stream.markdown(fragment)
          });
          if(pg.sqlCommands && pg.sqlCommands.length > 0){
            stream.markdown("\n\n💃 I can run these for you. Just click the button below");
            stream.button({
              command: "pg.run",
              title: vscode.l10n.t('Yes, Run This')
            });
          }

        }else{
          if(!pg.conn){
            //we need a connection
            stream.markdown("🧐 Connect this extension to Postgres using a .env file with a DATABASE_URL or setting /conn")
          }else{
            stream.markdown(util.readFile("HELP.md"));
          }

        }
    }
    
  }
  

  const dba = vscode.chat.createChatParticipant("dba.pg", handler);

  context.subscriptions.push(
    dba,
    vscode.commands.registerCommand("pg.run", async () => {
      //the json is cached already, just convert it and save
      try{
        await pg.run();
        if(pg.results && pg.results.length > 0){
          //outputs the results if there are any
          await pg.report();
          vscode.window.showInformationMessage("🤙🏼 Query executed", "OK")
        }else{
          vscode.window.showInformationMessage("🤙🏼 Changes made", "OK")
        }
      }catch(err){
        vscode.window.showInformationMessage("🤬 There was an error: " + err.message, "OK")
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
