const vscode = require("vscode");
const { EventEmitter } = require("events");

//the base class for chat participants
class Participant extends EventEmitter {
  constructor() {
    super();
    //this.llm = vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-3.5-turbo' };
    //this.llm = vscode.LanguageModelChatSelector;// = { vendor: 'copilot', family: 'gpt-4' };
    //should be overridden
    this.systemPrompt = "You are a friendly participant in a chat. You have been asked to provide some information.";

    this.commands = {};
    this.codeblocks = [];
    this.codeTag = "js";
  }

  //this method is one of the key aspects to running a participant
  //as it allows you to work with the user's prompt before sending off
  //that means you can add the "expert" part of your participant here
  //as needed. For tone and style, you should use the system prompt in the
  //constructor.
  async defaultResponse(request, stream) {
    return this.send(request.prompt, stream);
  }
  //pulls fenced codeblocks out of the markdown and stores them
  //so you can run if you like
  parseCodeBlocks(md) {
    const pattern = new RegExp(`(?<=\`\`\`${this.codeTag}).+?(?=\`\`\`)`, "gs");
    //const codePattern = /(?<=```sql).+?(?=```)/gs;
    this.codeblocks = md.match(pattern);
  }

  //sends a prompt to the language model and streams the response
  //to the chat window. Also caches the markdown for later use.
  async send(prompt, stream, token) {

    const sendMessages = [
      vscode.LanguageModelChatMessage.User(this.systemPrompt),
      vscode.LanguageModelChatMessage.User(prompt)
    ]

    const MODEL_SELECTOR = { vendor: 'copilot', family: 'gpt-4o' };
    const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);

    const response = await model.sendRequest(sendMessages, {}, token);

    const fullResponse = [];
    for await (const fragment of response.text) {
      fullResponse.push(fragment);
      stream.markdown(fragment);
    }
    const markdown = fullResponse.join("");
    this.parseCodeBlocks(markdown);
    return this.markdown;
  }

  //called from the extension.js file, the primary entry point
  //for all chat requests
  async handle(request, context, stream, token) {
    const prompt = request.prompt.trim();
    const command = request.command;

    //ensure we have an action to perform, if not, show the help
    if (prompt === "" && !command) {
      //there should always be a help command
      const command = this.commands.help;
      return command.handler(request, stream, token);
    } else {
      //check the commands hash to see if we have a handler
      const command = this.commands[request.command];
      if (command) {
        await command.handler(request, stream, token);
      } else {
        //do the default response
        const md = await this.defaultResponse(request, stream, token);
        this.emit("sent", { stream, md })
        //IMPORTANT: at this point, the stream is closed and we can no longer
        //interact with the chat window. If you need to notify the user of anything,
        //you'll have to pop up a notification. You can also do followup providers
        //or add a button. See the "sent" event handler in the PG constructor for an example of that.
      }
    }
  }

}

module.exports = Participant;
