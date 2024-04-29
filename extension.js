// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const util = require("./lib/utils");
const PG = require("./lib/pg");
//wraps the logic for this extension
//const {PostgresParticipant} = require("./lib/chat");

//a helpful thing for working with VS Code and Copilot

async function activate(context) {


  //const pg = new PostgresParticipant();
  //this is called by pg.run as well as /sql
  //which is why it needs to be activator scoped
//   const execQuery = async function(){

//     try{
//       //is this a redo? It is if we have a query.sql file open
//       const sql = util.readFile("temp/query.sql");
//       if(sql && util.tempfileInEditor("query.sql")){
//         pg.sqlCommands.length = 0;
//         pg.sqlCommands.push(sql);
//       }
//       await pg.run();
//       if(pg.results && pg.results.length > 0){
//         //outputs the results if there are any
//         await pg.report();
//         //vscode.window.showInformationMessage("🤙🏼 Query executed", "OK")
//       }else{
//         vscode.window.showInformationMessage("🤙🏼 Query executed with no results", "OK")
//       }
//       //if we're here, we're good to go
//       //util.removeFile("temp/query.sql");
//     }catch(err){
//       //if there's an error, let's write the SQL to a temp file
//       //see if they can change it
      
//       const sql = pg.sqlCommands.join("\n\n");
//       const out = `/*
// Looks like there's a SQL problem: ${err.message}. 
// Copilot does its best but sometimes needs a little help!
// Try fixing the problem below and then save the file. Click the 'Run This' button to execute again.
// */
      
// ${sql}
// `;

//       await util.writeToTemp("query.sql", out);
//       //vscode.window.showInformationMessage("🤬 There was an error: " + err.message, "OK")
//     }
//   }
//   //offer the results as a variable 
//   pg.variable("results", "The results of the last query in JSON format", {
//     //this will pop a dialog
//     resolve: function(){
//       if(pg.results && pg.results.length > 0){
//         return JSON.stringify(pg.results, null, 2);
//       }else{
//         return "[]";
//       }
//     }
//   });

  // const handler = async function (request, ctx, stream, token) {
  //   //the main chat function, which calls copilot.
  //   //this is used in two places: the default switch handler
  //   //and also in the /history command to rerun prompts
  //   const execChat = async function(prompt){
  //     stream.progress("👨🏻‍🎤 Talking to Copilot...");

  //     await pg.chat(prompt, token, function(fragment){
  //       stream.markdown(fragment)
  //     });
  //     if(pg.sqlCommands && pg.sqlCommands.length > 0){
  //       stream.markdown("\n\n💃 I can run these for you. Just click the button below");
  //       stream.button({
  //         command: "pg.run",
  //         title: vscode.l10n.t('Run This')
  //       });
  //     }
  //   }

  //   const prompt = request.prompt.trim();
    
  //   //set the output format
  //   switch(request.command){
  //     //change the output format
  //     case "out":
  //       const picks = ["json","csv", "text"];
  //       if(picks.indexOf(prompt) >=0 ){
  //         pg.outputFormat = prompt;
  //       }else{
  //         pg.outputFormat = await vscode.window.showQuickPick(picks);
  //       }
  //       stream.markdown("🤙🏼 Output format set to `"  + pg.outputFormat + "`");
  //       await pg.report();
  //       break;
  //     case "help":
  //       stream.markdown(util.readFile("HELP.md"));
  //       break;
  //     //run a SQL statement. Will work for anything aside from DROPs
  //     //which is true for any commands. 
  //     case "sql":
  //       //reset
  //       pg.sqlCommands.length = 0;
  //       //is this scary? Not sure.
  //       pg.sqlCommands.push(request.prompt);
  //       await execQuery();
  //       break;
  //     case "show":
        // if(pg.conn){
        //   let out = ["```json"];
        //   if(prompt === "tables" || prompt.trim() === ""){
        //     stream.markdown("Here are the tables in the database. You can ask for details about any table using `show [table]`.\n")
        //     let tables = await pg.getTableList();
        //     tables.forEach(t => out.push(t.table_name));
        //     out.push("```");
        //     stream.markdown(out.join("\n"))
        //   }else{
        //     const table = await pg.showTable(prompt);
        //     if(table){
        //       stream.markdown("Here are details for `" + prompt + "`\n");
        //       out.push(table);
        //       out.push("```");
        //       stream.markdown(out.join("\n"))
        //     }else{
        //       stream.markdown("🧐 Can't find the table `"+ prompt + "` \n")
        //     }
        //   }
        // }else{
        //   stream.markdown("🤔 Make sure the connection is set with /conn and you pass a table name");
        // }
  //       break;
  //     case "conn": 
  //       //allow for passing in of DB name for local servers
  //       //if we have a prompt and there are no spaces...
  //       if(prompt.length > 0 && prompt.indexOf(" ") < 0){
  //         pg.conn = `postgres://localhost/${prompt}`;
  //       }else{
  //         stream.progress("Setting the connection. Pop it in the box at the top of the editor...")
  //         pg.conn = await vscode.window.showInputBox({
  //           prompt: "Which database?",
  //           value: "postgres://localhost/chinook"
  //         });
  //       }
  //       pg.setDb();
  //       stream.markdown("🤙🏼 Connection set to `"  + pg.conn + "`");
  //       break;
  //     default:
  //       //the default is to just run the chat, using whatever was entered
  //       if(pg.conn && prompt.length > 0){
  //         await execChat(request.prompt);
  //       }else{
  //         if(!pg.conn){
  //           //we need a connection
  //           stream.markdown("🧐 Connect this extension to Postgres using a .env file with a DATABASE_URL or setting /conn")
  //         }else{
  //           stream.markdown(util.readFile("HELP.md"));
  //         }

  //       }
  //   }
    
  // }

  const pg = new PG();
  vscode.chat.registerChatVariableResolver("results", "The results of the last query in JSON format", {
    resolver: () => {
      if(pg.queryResults && pg.queryResults.length > 0){
        return JSON.stringify(pg.queryResults, null, 2);
      }else{
        return "[]";
      }
    }
  });
  const participant = vscode.chat.createChatParticipant("dba.pg", async (request, context, 
    stream, token) => {

    await pg.handle(request, context, stream, token)

  });

  context.subscriptions.push(
    participant,
    vscode.commands.registerCommand("pg.run", async () => {
      await pg.run();
      await pg.report();
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
