// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
//const LANGUAGE_MODEL_ID = "copilot-gpt-4"; // a lot slower than below
const LANGUAGE_MODEL_ID = "copilot-gpt-3.5-turbo";
const fs = require("fs");
const path = require("path");

const tempDir = path.resolve(__dirname, "temp");
const dbPath = path.resolve(tempDir, "dba.db");
//const db = new sqlite3.Database(path.resolve(tempDir,"dba.db"));
const { AsyncDatabase } = require("promised-sqlite3");

function activate() {
  const tables = [];
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("DBA has awoken");

  const thisDir = vscode.workspace.workspaceFolders[0].uri.path;
  const dirPath = path.resolve(thisDir, "./dba/");
  const sqlFile = path.resolve(dirPath, "db.sql");

  if (fs.existsSync(sqlFile)) {
    const sql = fs.readFileSync(sqlFile, "utf-8");
    console.log("Loading file...");
    tables.push(sql);
  }

  const writeSql = async function () {
    const sql = tables.join("\n");

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
    fs.writeFileSync(path.resolve(dirPath, "db.sql"), sql, "utf-8");
    var openPath = vscode.Uri.file(sqlFile);
    const openDoc = await vscode.workspace.openTextDocument(openPath);
    await vscode.window.showTextDocument(openDoc);
    //if the file isn't open, open it
    // if (!vscode.window.activeTextEditor) {
    //   //we need to open it
    //   vscode.window.showTextDocument(sqlFile);
    // }
  };
  const handler = async function (request, ctx, stream, token) {
    //do we have SQL in the dba directory?

    if (request.command === "table") {
      //we need to create a table based on a prompt
      stream.progress("One second. Don't touch anything...");

      const messages = [
        new vscode.LanguageModelChatSystemMessage(
          "You are a grumpy database administrator asked to create a table in a database and you don't have time for the task but you'll grudgingly do it anyway"
        ),
        new vscode.LanguageModelChatUserMessage(
          `Create a table for a SQLite database for ${request.prompt}. Add as many columns as possible. Be sure to add an id integer auto incrementing column for the primary key and created_at and updated_at date fields with a default for today at the end. Include a drop statement before the create statement. Create 10 insert statements for this table, adding test data that we can query later. All table and column names should be in lowercase. IMPORTANT: the statement should be complete with no comments and should not ask me to fill in details.`
        ),
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
        const sql = matches[0];
        tables.push(sql);
        const db = await AsyncDatabase.open(dbPath);
        await db.exec(sql);
        await db.close();
      }

      //create or update the db.sql file
      writeSql();
      stream.markdown(
        "\n\nThe SQL is to your right. You can add more to it, edit it, whatever I don't care."
      );
    } else if (request.command === "query") {
      stream.progress("SQL 101 coming right up... 🙄");
      const messages = [
        new vscode.LanguageModelChatSystemMessage(
          "You are a grumpy database administrator asked to write a SQL query for a SQLite database."
        ),
        new vscode.LanguageModelChatUserMessage(
          `Create a query for a SQLite database with '${
            request.prompt
          }' as context. Use ${tables.join(
            "\n"
          )} as the reference schema for this query.`
        ),
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
        const sql = matches[0];
        const db = await AsyncDatabase.open(dbPath);
        const rows = await db.all(sql);
        await db.close();
        let out = "\n\n```json\n";
        out += JSON.stringify(rows, null, 2);

        out += "\n```\n";
        stream.markdown(out);
        stream.markdown("\n\n The results are above. Can I go now?");
      } else {
        stream.markdown("\n\n No query to run... taking a nap");
      }
    }
  };
  const dba = vscode.chat.createChatParticipant("dba", handler);
  dba.isSticky = true;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
