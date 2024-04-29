const vscode = require("vscode");
const Command = require("./command");

class Participant{

  constructor(llm = "copilot-gpt-4"){
    //used for file or data operations
    this.outputFormat = "json";
    this.llm = llm;
    this.systemPrompt="Be nice, play good";
    this.prompt="";
    this.userPrompt="";
    this.commands = {}
  }
  
  setCommand(name, handler){
    this.commands[name] = new Command(name, handler);
  }
  variable(name, description, resolver){
    vscode.lm.registerChatVariableResolver(name, description, resolver);
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

