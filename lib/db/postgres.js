const pgp = require("pg-promise")({});

//This is ANSI SQL, but the default schema will vary based on platform
//Postgres uses "public" whereas SQLServer uses "dbo". SQLite doesn't have schemas
//and I don't know what MySQL does
const schemaSql = `SELECT table_name, column_name, data_type, character_maximum_length, column_default, is_nullable
FROM information_schema.columns
where table_schema = 'public'`

const tableSql = `SELECT table_name
FROM information_schema.tables
where table_schema = 'public'`

class Postgres{
  constructor(conn){
    this.db = pgp(conn);
  }
  getTable(name){
    return this.db.manyOrNone(schemaSql + ` and table_name = $1`, [name]);
  }
  getSchema(){
    return this.db.many(schemaSql); 
  }
  getTables(){
    return this.db.manyOrNone(tableSql); 
  }
  run(sql){
    return this.db.manyOrNone(sql);
  }
  close(){
    try{
      this.db.$pool.end();
    }catch(err){
      //this will happen if the connection is already closed
      //no need to catch
    }
    
  }
}

module.exports = Postgres;