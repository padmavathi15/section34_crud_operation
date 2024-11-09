const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const axios = require('axios');
const app = express();

// PostgreSQL connection setup
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'book_notes',
  password: 'padma_postgres',
  port: 5432,
});

// Set up EJS and public directory
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Home route to display books
app.get('/', async (req, res) => {
  try {
    const { rows: books } = await pool.query('SELECT * FROM books ORDER BY date_read DESC');
    res.render('index', { books });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Add book form route
app.get('/add', (req, res) => {
  res.render('addBook');
});
// Add book - handle form submission
app.post('/add', async (req, res) => {
  const { title, author, rating, date_read, review } = req.body;
  let coverUrl = '/images/placeholder.jpg'; // Fallback if no cover found

  try {
    // Fetch book data from Open Library to get OLID
    const searchResponse = await axios.get(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`);
    const bookData = searchResponse.data.docs[0]; // Take the first result

    if (bookData && bookData.cover_edition_key) {
      // Construct cover URL with OLID
      coverUrl = `https://covers.openlibrary.org/b/olid/${bookData.cover_edition_key}-L.jpg`;
    }

    // Insert new book into database
    await pool.query(
      'INSERT INTO books (title, author, rating, date_read, review, cover_url) VALUES ($1, $2, $3, $4, $5, $6)',
      [title, author, rating, date_read, review, coverUrl]
    );

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding book');
  }
});


// Edit book form route
app.get('/edit/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    res.render('editBook', { book: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading edit form');
  }
});

// Update book - handle form submission
app.post('/edit/:id', async (req, res) => {
  const { id } = req.params;
  const { title, author, rating, date_read, review } = req.body;

  try {
    await pool.query(
      'UPDATE books SET title = $1, author = $2, rating = $3, date_read = $4, review = $5 WHERE id = $6',
      [title, author, rating, date_read, review, id]
    );
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating book');
  }
});

// Delete book
app.post('/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM books WHERE id = $1', [id]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting book');
  }
});

// Start server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
