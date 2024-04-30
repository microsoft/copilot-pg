//this module will open, read, and write files to the VS Code editor

const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const workspaceDir = vscode.workspace.workspaceFolders[0].uri.path;
const tempDir = path.join(__dirname,"../","temp");

exports.writeAndShowFile = function(fileName, content){
  this.saveTempFile(fileName, content);
  this.openTempFile(fileName);
}

exports.saveTempFile = function(fileName, content){
  //just in case
  if(!fs.existsSync(tempDir)){
    fs.mkdirSync(tempDir);
  }
  
  const filePath = path.resolve(tempDir,fileName);
  fs.writeFileSync(filePath, content, "utf-8");
}

exports.openTempFile = function(fileName){
  const filePath = path.resolve(tempDir, fileName);
  var openPath = vscode.Uri.file(filePath);
  const openDoc = vscode.workspace.openTextDocument(openPath);
  vscode.window.showTextDocument(openDoc);
}

exports.currentFileNameIs = function(fileName){
  const tempFile =  path.resolve(tempDir, fileName);
  if(vscode.window.activeTextEditor && vscode.window.activeTextEditor.document){
    //this is *unsaved* text
    return vscode.window.activeTextEditor.document.fileName === tempFile;
  }
  return false;
}

exports.readCurrentEditor = function(){
  //make sure there's an open editor
  if(vscode.window.activeTextEditor && vscode.window.activeTextEditor.document){
    //this is *unsaved* text
    return vscode.window.activeTextEditor.document.getText();
  }
  return null;
}

exports.getDotEnvValue = function(key){
  const envFile = path.resolve(workspaceDir, ".env");
  const env = require("dotenv").config({ path: `${envFile}` });
  return env.parsed[key];
}