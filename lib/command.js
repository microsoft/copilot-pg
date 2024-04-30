const vscode = require('vscode');
const assert = require("assert");
const path = require("path");
const fs = require("fs");

//abstracts the idea of a /command in the chat
//which can fire off a handler
class Command {

  constructor(name, handler) {
    assert(name, "Command must have a name");
    assert(handler, "Command must have a handler");
    this.name = name;
    this.handler = handler;
  }
}

exports.createCommand = function(name, cb){
  return new Command(name, cb);
}

exports.selectionCommand = function(name, choices, cb) {
  //check the prompt for the selection
  return new Command(name, async (request, stream) => {
    let out = "";
    if(choices.indexOf(request.prompt) >=0 ){
      out = request.prompt;
    }else{
      out = await vscode.window.showQuickPick(choices);
    }
    if(cb) cb(out, stream)
  });
};

exports.inputCommand = function(name, prompt, value, cb) {
  //check the prompt for the selection
  const cmd = new Command(name, async (request, stream) => {
    let out = "";
    if(request.prompt && request.prompt.length >=0 ){
      out = request.prompt;
    }else{
      out = await await vscode.window.showInputBox({
        prompt,
        value
      });
    }
    //always default to localhost if it's not set
    if(!out.startsWith("postgres://")){
      out = "postgres://localhost/" + out;
    }
    if(cb) cb(out, stream);
  });
  return cmd;
}

exports.showDocsCommand = function(name, fileName) {
  const cmd = new Command(name, (_request, stream) => {
    //if we're showing a markdown file, it's in the same directory
    const filePath = path.resolve(__dirname, "..", "docs", fileName);
    if(fs.existsSync(filePath)){
      stream.markdown(fs.readFileSync(filePath,"utf-8"));
    }else{
      throw new Error("Can't find that file: " + filePath);
    }
  });
  return cmd;
}