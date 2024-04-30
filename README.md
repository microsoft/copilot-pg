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

## Extension Commands

There are a few commands you can use with this extension, including:

 - `/conn` will prompt you for the new connection string.
 - `/out` will set the format of your results to `csv`, `json`, or `text` (ascii table)
 - `/show` shows a list of your tables in the chat window.
 - `/show [table]` will show the details of the table.


## Variables

You can send your results to other chat participants using `#results`.

## But... does it work?

The extension will pull the SQL from the response, and run it for you against your database, outputting the results into a temp page in your editor window. The default is JSON, but you can also do CSV and ASCII table, as seen below:

```
+---------------------------------------+
|      show all albums by 'AC/DC'       |
+---------------------------------------+
|                 title                 |
+---------------------------------------+
| For Those About To Rock We Salute You |
| Let There Be Rock                     |
+---------------------------------------+
```

You can change the output if you like, and File - Save As however you want. This is great for JSON and CSV.
