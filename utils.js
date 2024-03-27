var { AsciiTable3, AlignmentEnum } = require('ascii-table3');

exports.sluggify = function(val){
    return val
      .toString()
      .normalize('NFD')                   // split an accented letter in the base letter and the acent
      .replace(/[\u0300-\u036f]/g, '')   // remove all previously split accents
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]/g, '')   // remove all chars not letters, numbers and spaces (to be replaced)
      .replace(/\s+/g, "-");
}

exports.jsonToAscii = function(name, json){
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
  return table.toString();
}

exports.jsonToDDL = function (schema) {
  const out = [];
  const tableNames = this.tableNames(schema);
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
};

exports.tableNames = function (schema) {
  const tables = {};

  for (let row of schema) {
    tables[row.table_name] = row;
  }
  return Object.keys(tables);
};
