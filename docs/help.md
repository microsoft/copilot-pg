This is the PostgreSQL chat participant, `@pg`. You can use it to help you query, and even _build_ your PostgreSQL database.

If you have a `.env` file in your workspace and it has a `DATABASE_URL`, that connection string will be used by default. You can override that using a command, however:

 - `/conn` will prompt you for the new connection string.
 - `/out` will set the format of your results to `csv`, `json`, or `text` (ascii table)
 - `/show` shows a list of your tables in the chat window.
 - `/show [table]` will show the details of the table.
 - `/ddl` will tell Copilot that you're specifically wanting to work with Data Definition Language (`create table`, etc) to build our your database.
 
To get started, make sure you have a connection set and off you go. 

## Tips

It helps to be as detailed as you can. Copilot can be surprising! You can change your database, add tables or columns, setup complex queries, and so on.

You'll always be asked before any query is run. 

Have fun!