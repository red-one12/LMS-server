const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;



app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))
app.use(express.json());
app.use(cookieParser());








const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zjl69.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




const verifyJWT = (req, res, next) => {
  const token = req.cookies.token; 
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized: No token provided' }); 
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden: Invalid token' }); 
    }
    req.user = decoded; 
    next();
  });
};


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();



    // auth related apis
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: '1h'});
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: false
      })
      .send({success: true});
    })





    const database = client.db("LMS");
    const books_category_collection = database.collection("books_category");
    const all_books_Collections = database.collection("allBooks");
    const borrowedBooksCollection = database.collection('borrowedBooks');



    // books category related apis 
    app.get('/books-category', async(req, res) => {
      const booksCategory = books_category_collection.find();
      const result = await booksCategory.toArray();
      res.send(result);
    })






    // books related apis


    app.post('/books', async (req, res) => {
      const newBook = req.body; 
      const result = await all_books_Collections.insertOne(newBook);
    
      res.send(result);
    });
    



    app.get('/books', async(req, res) => {
      const books = all_books_Collections.find();
      const result = await books.toArray();
      res.send(result);
    })




    app.get('/books/:category', async (req, res) => {
      const category = req.params.category; 
      const query = { category: category }; 
      const books = all_books_Collections.find(query); 
      const result = await books.toArray(); 
      res.send(result); 
    });



    app.get('/book/:id', async (req, res) => {
      
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await all_books_Collections.findOne(query);
      res.send(result);
    });




    app.put('/book/:id', async (req, res) => {
      const { id } = req.params;
      const updatedBook = req.body; 
    
      try {
        const result = await all_books_Collections.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedBook }
        );
    
        res.status(200).json({ message: "Book updated successfully", result });
      } catch (error) {
        console.error("Error updating book:", error);
        res.status(500).json({ message: "An error occurred while updating the book" });
      }
    });






    // borrow related apis

    app.post('/borrowedBooks', async (req, res) => {
      const borrowedBook = req.body;
      const bookId = borrowedBook.bookId;
    
      try {
        
        const book = await all_books_Collections.findOne({ _id: new ObjectId(bookId) });
    
        if (book.quantity > 0) {
          
          const updateResult = await all_books_Collections.updateOne(
            { _id: new ObjectId(bookId) },
            { $inc: { quantity: -1 } }
          );
    
   
          const insertResult = await borrowedBooksCollection.insertOne(borrowedBook);
    
          res.status(200).send({
            message: 'Book borrowed successfully',
            updateResult,
            insertResult,
          });
        } else {
          res.status(400).send({ message: 'Book is out of stock' });
        }
      } catch (error) {
        console.error('Error borrowing book:', error);
        res.status(500).send({ message: 'An error occurred while borrowing the book' });
      }
    });






    // API to get all borrowed books
app.get('/borrowedBooks', async (req, res) => {
  try {
 
    const borrowedBooks = await borrowedBooksCollection.find().toArray();

    
    const borrowedBooksWithDetails = await Promise.all(
      borrowedBooks.map(async (borrowedBook) => {
        const book = await all_books_Collections.findOne({ _id: new ObjectId(borrowedBook.bookId) });
        return {
          ...borrowedBook,
          bookDetails: book,
        };
      })
    );

    res.status(200).send(borrowedBooksWithDetails);
  } catch (error) {
    console.error('Error fetching borrowed books:', error);
    res.status(500).send({ message: 'An error occurred while fetching borrowed books' });
  }
});







// API to get borrowed books filtered by user email
app.get('/borrowedBooks/:email', async (req, res) => {
  const userEmail = req.params.email;
  try {
    const borrowedBooks = await borrowedBooksCollection.find({ email: userEmail }).toArray();
    res.status(200).send(borrowedBooks);
  } catch (error) {
    console.error('Error fetching user-specific borrowed books:', error);
    res.status(500).send({ message: 'An error occurred while fetching borrowed books' });
  }
});








// API to return a book
app.delete('/borrowedBooks/:id', async (req, res) => {
  const borrowedBookId = req.params.id;
  try {
   
    const borrowedBook = await borrowedBooksCollection.findOne({ _id: new ObjectId(borrowedBookId) });

    if (!borrowedBook) {
      return res.status(404).send({ message: 'Borrowed book not found' });
    }


    const updateResult = await all_books_Collections.updateOne(
      { _id: new ObjectId(borrowedBook.bookId) },
      { $inc: { quantity: 1 } }
    );

    
    const deleteResult = await borrowedBooksCollection.deleteOne({ _id: new ObjectId(borrowedBookId) });

    res.status(200).send({
      message: 'Book returned successfully',
      updateResult,
      deleteResult,
    });
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).send({ message: 'An error occurred while returning the book' });
  }
});








    
    
    


    
    
    














    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})