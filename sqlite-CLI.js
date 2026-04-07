#!/usr/bin/env node

// -------------------------------------
// SQLite CLI tool by siakinnik
// For working with SQLite databases in projects using SQLite
// -------------------------------------

// Dependencies
const sqlite3 = require("sqlite3").verbose();
const readline = require("readline-sync");

const colors = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

const dbName = process.argv[2] ? process.argv[2] : readline.question(colors.blue("Enter SQLite Data Base name: "));
const db = new sqlite3.Database(dbName, (err) => {
  if (err) {
    console.error(colors.red("Error while connecting:"), err.message);
    process.exit(1);
  }
  console.log(colors.green(`Connected to ${dbName}`));
});

const runQuery = (query) => {
  return new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

const describeTable = async (tableName) => {
  const result = await runQuery(`PRAGMA table_info(${tableName})`);
  if (result.length > 0) {
    console.log(colors.yellow(`Structure of table "${tableName}":`));
    console.table(result);
  } else {
    console.log(colors.red(`Table "${tableName}" does not exist.`));
  }
}

const showTableData = async (tableName) => {
  try {
    const result = await runQuery(`SELECT * FROM ${tableName};`);
    if (result.length > 0) {
      console.table(result); 
    } else {
      console.log(colors.gray("Successfully executed, but no data was returned."));
    }
  } catch (err) {
    console.error(colors.red("SQL error:"), err.message);
  }
};


const main = async () => {
  console.clear();
  console.log(colors.yellow("Welcome to SQLite CLI by primelog! Enter your SQL-request or \"exit\" to leave."));

  while (true) {
    let query = "";
    while (true) {
      let line = readline.question(colors.cyan(`${dbName}> `)).trim();
      query += line + " ";
      if (query.toLowerCase().trim() === "exit") break;
      if (line.endsWith(";")) break;
    }

    if (query.toLowerCase().trim() === "exit;") break;
    if (query.toLowerCase().trim() === "exit") break;

    const normalizedQuery = query.toLowerCase().trim();

    // Handle the special cases for DESC, DESCRIBE, TABLE
    if (normalizedQuery.startsWith("desc") || normalizedQuery.startsWith("describe")) {
      const tableName = normalizedQuery.split(" ")[1][normalizedQuery.split(" ")[1].length - 1] === ";" ? normalizedQuery.split(" ")[1].slice(0, -1) : normalizedQuery.split(" ")[1];
      if (tableName) {
        await describeTable(tableName);
      } else {
        console.log(colors.red("Please provide a table name."));
      }
    } else if (normalizedQuery.startsWith("table")) {
      const tableName = normalizedQuery.split(" ")[1][normalizedQuery.split(" ")[1].length - 1] === ";" ? normalizedQuery.split(" ")[1].slice(0, -1) : normalizedQuery.split(" ")[1];
      if (tableName) {
        await showTableData(tableName);
      } else {
        console.log(colors.red("Please provide a table name."));
      }
    } else {
      try {
        const result = await runQuery(query);
        if (result.length > 0) {
          console.table(result);
        } else {
          console.log(colors.gray("Successfully executed, but no data was returned."));
        }
      } catch (err) {
        console.error(colors.red("SQL error:"), err.message);
      }
    }
  }

  db.close(() => console.log(colors.green("Connection closed.")));
}

main();
