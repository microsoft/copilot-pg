//The module helps work with the VS Code editor and file system. 

const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const workspaceDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
const tempDir = path.join(__dirname,"../","temp");

//a wrapper for writing and showing a file
exports.writeAndShowFile = function(fileName, content){
  this.saveTempFile(fileName, content);
  this.openTempFile(fileName);
}

//temp files exist in the extension directory, in the temp folder.
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

//careful with this one - we *do not* want to grab an ENV setting
//from the user's machine. This is for the .env file in the workspace
//DATABASE_URL could be set to anything, even prod somewhere!
exports.getDotEnvValue = function(key){
  const envFile = path.resolve(workspaceDir, ".env");
  console.log("ENV path", envFile);
  //there's an issue here on Windows
  const env = require("dotenv").config({ path: `${envFile}` });
  return env.parsed[key];
}