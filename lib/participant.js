const vscode = require("vscode");
const path = require("path");
const fs = require("fs");


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

  // addCommand(name, handler){
  //   this.commands[name] = new Command(name, handler);
  // }
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
