const vscode = require("vscode");
var { AsciiTable3, AlignmentEnum } = require('ascii-table3');

class DB {
  constructor(conn){
    if(conn.indexOf("postgres://") === 0){
      const PG = require("./postgres");
      this.conn = conn;
      this.db = new PG(conn);
    }
  }
  async run(sql){
    console.log("Running",sql);
    return this.db.run(sql);
  }
  async buildSchema(){
    const schemaRows = await this.db.getSchema(this.conn);
    return this.jsonToDDL(schemaRows);
  }
  jsonToDDL(schema) {
    const tables = {};
    for (let row of schema) {
      tables[row.table_name] = row;
    }
    const out = [];
    const tableNames = Object.keys(tables);
    for (let table of tableNames) {
      const sql = [`create table ${table}(\n`];
      const cols = schema.filter((s) => s.table_name === table);
      for (let c of cols) {
        let colSql = "";
        //if (c.column_name === null || c.column_name === "") continue;
        colSql = `  ${c.column_name} ${c.data_type}`;
        if (c.is_nullable === "NO") colSql += " not null ";
        if (c.column_default === "NO") colSql += ` default ${c.column_default} `;
        colSql += ",\n";
        sql.push(colSql);
      }
      sql.push(");");
      out.push(sql.join(""));
    }
    return out.join("\n");
  }
  jsonToAscii(name, json){
    //expecting an array here
  
    if(json.length === 0) return "";
  
    const cols = Object.keys(json[0]);
    var table = new AsciiTable3(name).setHeading(...cols)
    
    for(let item of json){
      const vals = Object.values(item);
      table.addRow(...vals)
    }
    //auto align
    for(let i = 0; i < cols.length; i++){
      table.setAlign(i, AlignmentEnum.AUTO);
    }
    return table.toString() + "\n\n";
  }
  async runCommands(commands){
    let out = [], results=[];
    for(let sql of commands){
      const rows = await this.db.run(sql);
      if(rows && rows.length > 0){
        //if there are results, let's show them!
        //turn the JSON into an ASCII table and then pop it in the editor window
        out.push(this.jsonToAscii("Results", rows));
        results.push(rows)
      }
    }
    const ascii = out.join("\n\n");
    return {results, ascii}
  }
  hasChanges(commands){
    for(let c of commands){
      if(!c.trim().toLowerCase().startsWith("select")){
        return true;
      }
    }
    return false;
  }
  async close(){
    await this.db.close();
  }
}

module.exports = DB;