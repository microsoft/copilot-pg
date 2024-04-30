const pgp = require("pg-promise")();
//this wraps up database interactions
class DB{
  constructor(conn){
    this.db = pgp(conn);
  }
  close(){
    this.db.$pool.end();
  }
  getTableList(){
    const sql = `SELECT table_name
    FROM information_schema.tables
    where table_schema = 'public'`
    return this.db.manyOrNone(sql);
  }
  async getSchema(){
    const sql = `SELECT table_name, column_name, data_type, character_maximum_length, column_default, is_nullable
    FROM information_schema.columns
    where table_schema = 'public'`;
    const schema = await this.db.many(sql);
    return this.schemaToDDL(schema);
  }
  async getTable(name){
    const sql = `SELECT table_name, column_name, data_type, character_maximum_length, column_default, is_nullable
    FROM information_schema.columns
    where table_schema = 'public'
    and table_name=$1`;
    const schema =  await this.db.manyOrNone(sql, [name]);
    return this.schemaToDDL(schema);
  }

  run(sql){
    return this.db.manyOrNone(sql);
  }

  schemaToDDL(schema){
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
}

module.exports = DB;