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
exports.jsonToDDL = function(schema) {
  const tables = {};
  for (let row of schema) {
    tables[row.table_name] = row;
  }
  const out = [];
  const tableNames = Object.keys(tables);
  for (let table of tableNames) {
    const sql = [`create table ${table}(\n`];
    const cols = schema.filter((s) => s.table_name === table);
    for (let c of cols) {
      let colSql = "";
      //if (c.column_name === null || c.column_name === "") continue;
      colSql = `  ${c.column_name} ${c.data_type}`;
      if (c.is_nullable === "NO") colSql += " not null ";
      if (c.column_default === "NO") colSql += ` default ${c.column_default} `;
      colSql += ",\n";
      sql.push(colSql);
    }
    sql.push(");");
    out.push(sql.join(""));
  }
  return out.join("\n");
}
exports.toCSV = async function(prompt, results){
  const fileName = this.sluggify(prompt)
  if(results.length === 0) return false;
  let converter = require('json-2-csv');
  const csv = await converter.json2csv(results);
  //util.writeToWorkspace("csvs",fileName + ".csv", csv, false);
  this.writeToTemp(`${fileName}.csv`, csv)
  return fileName;
}

exports.toJSON= function(prompt, results){
  const fileName = this.sluggify(prompt)
  this.writeToTemp(`${fileName}.json`,JSON.stringify(results, null, 2))
}
//this doesn't seem to work consistently
exports.toText= function(prompt, results){
  const fileName = this.sluggify(prompt);
  const ascii = this.jsonToAscii(prompt, results);
  this.writeToTemp(`${fileName}.txt`,ascii)
}

exports.readFile = function(fileName){
  const filePath = path.resolve(__dirname, "../", fileName);
  return fs.readFileSync(filePath,"utf-8");
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
exports.clearTemp = function(){
  const tempDir = path.resolve(__dirname,"../temp");
  const files = fs.readdirSync(tempDir);
  for(let f of files){
    fs.unlinkSync(path.resolve(tempDir, f));
  }
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