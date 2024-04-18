const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const thisDir = vscode.workspace.workspaceFolders[0].uri.path;
var { AsciiTable3, AlignmentEnum } = require('ascii-table3');

exports.sluggify = function(val){
    return val
      .toString()
      .normalize('NFD')                   // split an accented letter in the base letter and the acent
      .replace(/[\u0300-\u036f]/g, '')   // remove all previously split accents
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]/g, '')   // remove all chars not letters, numbers and spaces (to be replaced)
      .replace(/\s+/g, "-");
}

exports.getLocalEnvValue = function(key){
  const envFile = path.resolve(thisDir, ".env");
  const env = require("dotenv").config({ path: `${envFile}` });
  return env.parsed[key];
}
exports.getCodeFromChatResponse = function(md){

  const codePattern = /(?<=```sql).+?(?=```)/gs;
  return md.match(codePattern);
}
exports.writeToTemp = async function(fileName, val){
  //pop this in the extension temp
  //go one level up since we're in a subdir
  const tempDir = path.resolve(__dirname,"../temp");
  //just in case
  if(!fs.existsSync(tempDir)){
    fs.mkdirSync(tempDir);
  }
  const filePath = path.resolve(tempDir,fileName);
  fs.writeFileSync(filePath, val, "utf-8");
  var openPath = vscode.Uri.file(filePath);
  const openDoc = await vscode.workspace.openTextDocument(openPath);
  await vscode.window.showTextDocument(openDoc);
}
exports.jsonToAscii = function(name, json){
  //expecting an array here

  if(json.length === 0) return "";

  const cols = Object.keys(json[0]);
  var table = new AsciiTable3(name).setHeading(...cols)
  
  for(let item of json){
    const vals = Object.values(item);
    table.addRow(...vals)
  }
  //auto align
  for(let i = 0; i < cols.length; i++){
    table.setAlign(i, AlignmentEnum.AUTO);
  }
  return table.toString() + "\n\n";
}
//Some duplication here, I'll refactor as I can. This writes a file to the workspace
//and optionally shows it in the editor
exports.writeToWorkspace = async function(dir, fileName, val, showDoc = true){
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