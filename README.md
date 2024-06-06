# The Chat DBA for PostgreSQL

This is an experimental chat participant that uses Copilot to query your PostgreSQL database.

## Step 1: Create a .env file if you don't have one

This extension looks for a `.env` file in your project root, which should have a `DATABASE_URL` setting, pointing toward the database you want to use. For example:

```
DATABASE_URL="postgres://localhost/chinook"
```

## Step 2: Tell Copilot what you want to see

The entire `public` schema of your database will be loaded up to Copilot for each query. _This is only for the prompt_; we're not storing anything.

The query can be plain English, like so (using the Chinook database):

```
@pg Show all movies in the 'Sci-Fi' category
```

The names of the tables and any literal values should be cased properly and accurately named, otherwise Copilot will hallucinate the returns to best fit what you need.

Using the prompt above, you should see a message explaining the query and some actual SQL:

```sql
SELECT actor.actor_id, actor.first_name, actor.last_name
FROM actor
JOIN film_actor ON actor.actor_id = film_actor.actor_id
JOIN film_category ON film_actor.film_id = film_category.film_id
JOIN category ON film_category.category_id = category.category_id
WHERE category.name = 'Sci-Fi';
```

This is an actual Copilot response, and it was able to be this accurate because we sent along the schema in the background.

Let's do another one, looking for albums by AC/DC:

```
@pg show all albums by 'AC/DC'
```

Copilot's response:

```sql
SELECT album.title
FROM album
JOIN artist ON album.artist_id = artist.artist_id
WHERE artist.name = 'AC/DC';
```

## More Than Queries, Though

You can have copilot do all kinds of thing with your database schema. Need a repository for a given table (yeah, I know, just go with it):

```
@pg create a repository for the albums table using Node
```

And you should see something like this:

```js
const pgp = require('pg-promise')();

// Database connection details
const cn = {
    host: 'your_host',
    port: your_port,
    database: 'your_database',
    user: 'your_user',
    password: 'your_password'
};

// Database connection
const db = pgp(cn);

// Albums Repository
class AlbumsRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
    }
    
    // Create Album
    addAlbum(title, artistId, sku) {
        return this.db.none('INSERT INTO albums(title, artist_id, sku) VALUES($1, $2, $3)', [title, artistId, sku]);
    }

    // Get all Albums
    allAlbums() {
        return this.db.any('SELECT * FROM albums');
    }

    // Get album by id
    getAlbumById(id) {
        return this.db.one('SELECT * FROM albums WHERE id = $1', id);
    }

    // Update Album
    updateAlbum(id, title, artistId, sku) {
        return this.db.none('UPDATE albums SET title = $1, artist_id = $2, sku = $3 WHERE id = $4', [title, artistId, sku, id]);
    }

    // Delete Album
    deleteAlbum(id) {
        return this.db.none('DELETE FROM albums WHERE id = $1', id);
    }
}

// Exporting the class
module.exports = AlbumsRepository;
```

Don't want inline SQL? Ask Copilot to build you a query builder:

```
@pg I need a class that wraps the tables and helps build SQL queries using Node. Show examples for all tables.
```

Notice that I needed to provide explicit directions for language and also that it's for all the tables. You should see something like this:

```js
const pgp = require('pg-promise')();
const db = pgp('postgres://username:password@localhost:5432/database');

class QueryBuilder {
  constructor(table) {
    this.table = table;
  }

  findAll() {
    return db.any(`SELECT * FROM ${this.table}`);
  }

  findById(id) {
    return db.one(`SELECT * FROM ${this.table} WHERE id = $1`, id);
  }

  // Add as many helper methods as you want
}
```


## Specific Extension Commands

You can save time and typing by using slash commands when asking `@pg` for help. Here are a few:

 - `/conn` will prompt you for the new connection string.
 - `/out` will set the format of your results to `csv`, `json`, or `text` (ascii table)
 - `/show` shows a list of your tables in the chat window.
 - `/show [table]` will show the details of the table.
 - `/schema` helps you build your database, either starting from scratch or extending your current schema.
 - `/fix` Have a SQL error you need help with? Try using `/fix`.


## Help and Issues

Have an issue or need to report a bug? Help is always appreciated!