const vscode = require("vscode");
const assert = require("assert");

class CopilotChat{
  variable(name, description, cb){
    assert(name && description, "A name and description help people understand what this variable is for. Please add")    ;
    assert(cb, "Need a resolver function or else a variable is meaningless.")
    vscode.chat.registerChatVariableResolver(name, description, {
      //this will pop a dialog
      resolve: cb
    });
  }
  constructor(llm = "copilot-gpt-3.5-turbo"){
    this.systemPrompt = "";
    this.messages = [];
    this.llm = llm;
  }
  inputBox(prompt, value){
    return vscode.window.showInputBox({
      prompt,
      value
    })
  }
  queue(message){
    //dup check
    if(this.messages.indexOf(message) < 0){
      this.messages.push(message);
    }
  }
  async send(token){
    const sendMessages = [new vscode.LanguageModelChatSystemMessage(this.systemPrompt)]
    for(let m of this.messages){
      sendMessages.push(new vscode.LanguageModelChatUserMessage(m))
    }
    return vscode.lm.sendChatRequest(
      this.llm,
      sendMessages,
      {},
      token
    );
  }
}

module.exports = CopilotChat;