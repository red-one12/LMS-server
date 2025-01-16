const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;



app.use(cors())
app.use(express.json());








const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zjl69.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const database = client.db("LMS");
    const books_category_collection = database.collection("books_category");
    const all_books_Collections = database.collection("allBooks");



    // books category related apis 
    app.get('/books-category', async(req, res) => {
      const booksCategory = books_category_collection.find();
      const result = await booksCategory.toArray();
      res.send(result);
    })






    // books related apis
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




    app.post('/borrow/:id', async (req, res) => {
      const { id } = req.params;
      const { user, returnDate } = req.body;
    
      try {
        
        const book = await all_books_Collections.findOne({ _id: new ObjectId(id), quantity: { $gt: 0 } });
    
        if (!book) {
          return res.status(400).json({ message: "Book is out of stock or does not exist" });
        }
    
        
        const updatedBook = await all_books_Collections.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { quantity: -1 } }
        );
    
        
        const borrowedBooksCollection = database.collection("borrowedBooks");
        const borrowRecord = {
          bookId: id,
          user,
          returnDate,
          borrowedAt: new Date(),
        };
    
        await borrowedBooksCollection.insertOne(borrowRecord);
    
        res.status(200).json({ message: "Book borrowed successfully", updatedBook });
      } catch (error) {
        console.error("Error borrowing book:", error);
        res.status(500).json({ message: "An error occurred while borrowing the book" });
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