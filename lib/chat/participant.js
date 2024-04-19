const vscode = require("vscode");
const assert = require("assert");


class Participant{

  constructor(llm = "copilot-gpt-3.5-turbo"){
    //used for file or data operations
    this.outputFormat = "json";
    this.llm = llm;
    this.systemPrompt="Be nice, play good";
    this.prompt="";
    this.userPrompt="";
    this.history=[];
  }

  variable(name, description, cb){
    assert(name && description, "A name and description help people understand what this variable is for. Please add")    ;
    assert(cb, "Need a resolver function or else a variable is meaningless.")
    vscode.chat.registerChatVariableResolver(name, description, {
      //this will pop a dialog
      resolve: cb
    });
  }

  inputBox(prompt, value){
    return vscode.window.showInputBox({
      prompt,
      value
    })
  }

  selectionBox(choices=[]){
    return vscode.window.showQuickPick(choices)
  }

  async send(prompt, token){
    const sendMessages = [
      new vscode.LanguageModelChatSystemMessage(this.systemPrompt),
      new vscode.LanguageModelChatUserMessage(prompt)
    ]
    return vscode.lm.sendChatRequest(
      this.llm,
      sendMessages,
      {},
      token
    );
  }
}

module.exports = Participant;