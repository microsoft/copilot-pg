const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const assert = require("assert");

//TODO: do we need this class? I made it because I thought
//things might get more complex.
class Command {

  constructor(name, handler) {
    assert(name, "Command must have a name");
    assert(handler, "Command must have a handler");
    this.name = name;
    this.handler = handler;
  }

}

class Participant {
  constructor() {
    this.llm = "copilot-gpt-4";
    //should be overridden
    this.systemPrompt = "You are a friendly participant in a chat. You have been asked to provide some information.";
    this.commands = {};
    this.codeblocks = [];
    this.codeTag = "";
  }
  //hopefully overridden
  async formatPrompt(prompt){
    return prompt;
  }
  //this is the callback for when the chat has fully
  //responded. It should be overridden
  async parseResponse(markdown){
    return markdown;
  }
  async selectionCommand (name, choices, cb) {
    //check the prompt for the selection
    const cmd = new Command(name, async (request, stream) => {
      let out = "";
      if(choices.indexOf(request.prompt) >=0 ){
        out = request.prompt;
      }else{
        out = await vscode.window.showQuickPick(choices);
      }
      if(cb) cb(out, stream)
    });
    this.commands[name] = cmd;
  };
  async inputCommand(name, prompt, value, cb) {
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
      if(cb) cb(out, stream);
    });
    this.commands[name] = cmd;
  }
  async showDocsCommand(name, fileName) {
    const cmd = new Command(name, (_request, stream) => {
      //if we're showing a markdown file, it's in the same directory
      const filePath = path.resolve(__dirname, "..", "docs", fileName);
      if(fs.existsSync(filePath)){
        stream.markdown(fs.readFileSync(filePath,"utf-8"));
      }else{
        throw new Error("Can't find that file: " + filePath);
      }
    });
    this.commands[name] = cmd;
  }
  addVariable(name, description, resolver){
    vscode.chat.registerChatVariableResolver(name, description, resolver);
  }
  addCommand(name, handler){
    this.commands[name] = new Command(name, handler);
  }
  async send(prompt, stream, token){
    
    const sendMessages = [
      new vscode.LanguageModelChatSystemMessage(this.systemPrompt),
      new vscode.LanguageModelChatUserMessage(prompt)
    ]
    const response = await vscode.lm.sendChatRequest(
      this.llm,
      sendMessages,
      {},
      token
    );
    //stream it out
    const fullResponse = [];
    for await (const fragment of response.stream) {
      fullResponse.push(fragment);
      stream.markdown(fragment);
    }
    const markdown = fullResponse.join("");
    this.parseResponse(markdown, stream);
  }

  //this is the main handler for the chat
  //it will see if we have a command and try to handle it
  //otherwise it will send off to Copilot
  //best to override this if you need
  async handler(request, _ctx, stream, token){
    const command = this.commands[request.command];
    if(command){
      return command.handler(request, stream, token);
    }else{
      //it's a chat request
      const prompt = await this.formatPrompt(request.prompt);
      return this.send(prompt, stream, token);
    }
  }

}

module.exports = Participant;
