const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174','https://proquestor-2968f.web.app','https://proquestor-2968f.firebaseapp.com'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

app.listen(port, () => {
  console.log(`It is running on port ${port}`)
})




// mongoDB 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.neywkpg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



// function 
async function run() {
  try {
    
    const workSheetCollection = client.db('EmployeeManagement').collection('workSheet')
    const userMessage = client.db('EmployeeManagement').collection('UserMessage')
    const userInfo = client.db('EmployeeManagement').collection('users')
    const signUpUser = client.db('EmployeeManagement').collection('signUpUser')
    const salaryAndmonth = client.db('EmployeeManagement').collection('salaryAndMonth')


     // verify admin middleware
     const verifyAdmin = async (req, res, next) => {
      console.log('hello')
      const user = req.user
      const query = { email: user?.email }
      const result = await usersCollection.findOne(query)
      console.log(result?.role)
      if (!result || result?.role !== 'admin')
        return res.status(401).send({ message: 'unauthorized access!!' })

      next()
    }
    // verify host middleware
    const verifyHost = async (req, res, next) => {
      console.log('hello')
      const user = req.user
      const query = { email: user?.email }
      const result = await usersCollection.findOne(query)
      console.log(result?.role)
      if (!result || result?.role !== 'hr') {
        return res.status(401).send({ message: 'unauthorized access!!' })
      }

      next()
    }





    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })



    // create-payment-intent
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const price = req.body.price
      const priceInCent = parseFloat(price) * 100
      if (!price || priceInCent < 1) return
      // generate clientSecret
      const { client_secret } = await stripe.paymentIntents.create({
        amount: priceInCent,
        currency: 'usd',
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        automatic_payment_methods: {
          enabled: true,
        },
      })
      // send client secret as response
      res.send({ clientSecret: client_secret })
    })





     // save a google user data in db
     app.put('/googleUser', async (req, res) => {
      const user = req.body
      const query = { email: user?.email }
      // check if user already exists in db
      const isExist = await userInfo.findOne(query)
      if (isExist) {
        if (user.apply === 'Requested') {
          // if existing user try to change his role
          const result = await userInfo.updateOne(query, {
            $set: { apply: user?.apply},
          })
          return res.send(result)
        } else {
          // if existing user login again
          return res.send(isExist)
        }
      }

      // save user for the first time
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      }
      const result = await userInfo.updateOne(query, updateDoc, options)
      res.send(result)
    })




     // save a signUp user data in db
     app.put('/signUpUser', async (req, res) => {
      const user = req.body
      const query = { email: user?.email }
      // check if user already exists in db
      const isExist = await signUpUser.findOne(query)
      if (isExist) {
        if (user.apply === 'Requested') {
          // if existing user try to change his role
          const result = await signUpUser.updateOne(query, {
            $set: { apply: user?.apply},
          })
          return res.send(result)
        } else {
          // if existing user login again
          return res.send(isExist)
        }
      }

      // save user for the first time
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      }
      const result = await signUpUser.updateOne(query, updateDoc, options)
      res.send(result)
    })



    // Get User data 

    //get the google user data
    app.get('/googleUsers',async(req,res)=>{
      const result = await userInfo.find().toArray()
      res.send(result)
    })


     //get the signUp user data
     app.get('/signUpUsers',async(req,res)=>{
      const result = await signUpUser.find().toArray()
      res.send(result)
    })


    // Update Google user status
app.put('/googleUserStatus', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await userInfo.updateOne(
      { email },
      { $set: { status: "true" } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'An error occurred while updating user status.', error });
  }
});

// Update SignUp user status
app.put('/signUpUserStatus', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await signUpUser.updateOne(
      { email },
      { $set: { status: "true" } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'An error occurred while updating user status.', error });
  }
});



// Update Google user fire status
app.patch('/googleUsers/fire/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const result = await userInfo.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { fire: "true" } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'An error occurred while updating user fire status.', error });
  }
});

// Update SignUp user fire status
app.patch('/signUpUsers/fire/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const result = await signUpUser.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { fire: "true" } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'An error occurred while updating user fire status.', error });
  }
});






    // get a user info by email from db
    app.get('/googleUsers/:email', async (req, res) => {
      const email = req.params.email
      const result = await userInfo.findOne({ email })
      res.send(result)
    })


      //update a googleUsers role
      app.patch('/googleUsers/update/:email', async (req, res) => {
        const email = req.params.email
        const user = req.body
        const query = { email }
        const updateDoc = {
          $set: { ...user, timestamp: Date.now() },
        }
        const result = await userInfo.updateOne(query, updateDoc)
        res.send(result)
      })


      
    // Get a user by ID (corrected)
    app.get('/googleUser/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userInfo.findOne(query);
      res.send(result);
    });

    app.get('/signUpUser/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await signUpUser.findOne(query);
      res.send(result);
    });

    


    // get a user info by email from db
    app.get('/signUpUsers/:email', async (req, res) => {
      const email = req.params.email
      const result = await signUpUser.findOne({ email })
      res.send(result)
    })


    //update a signUpUsers role
    app.patch('/signUpUsers/update/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email }
      const updateDoc = {
        $set: { ...user, timestamp: Date.now() },
      }
      const result = await signUpUser.updateOne(query, updateDoc)
      res.send(result)
    })


    




    


    //create data work sheet
    app.post('/worksheets',async(req,res)=>{
      const worksheetData = req.body;
      const result = await workSheetCollection.insertOne(worksheetData)
      res.send(result)
    })

      

      //Get all work sheet from db

      app.get('/worksheet',async(req,res)=>{
        const result = await workSheetCollection.find().toArray()
        res.send(result)
      })

      // get the all own data from db 

      app.get("/taskForm/:email", async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const result = await workSheetCollection.find(query).toArray();
        res.send(result);
      });
  

      // user message send 

      // post all message data
      
    app.post('/message',async(req,res)=>{
      const worksheetData = req.body;
      const result = await userMessage.insertOne(worksheetData)
      res.send(result)
    })

      

      //Get all message data

      app.get('/messages',async(req,res)=>{
        const result = await userMessage.find().toArray()
        res.send(result)
      })


    //    // Save a salary data in db
    // app.post('/salary', verifyToken, async (req, res) => {
    //   const roomData = req.body
    //   const result = await salaryAndmonth.insertOne(roomData)
    //   res.send(result)
    // })


    // Save salary data in db
app.post('/salary', verifyToken, async (req, res) => {
  const roomData = req.body;
  
  // Extract email and date from the incoming data
  const { email, date } = roomData;

  // Convert the date to a month and year format
  const dateObj = new Date(date);
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();

  // Check if the record with the same email and month/year exists
  const existingRecord = await salaryAndmonth.findOne({
    email: email,
    month: month,
    year: year
  });

  if (existingRecord) {
    // If record exists, do not insert and send a response indicating the duplicate
    return res.status(400).send({ message: 'Salary data for this month already exists for this email.' });
  }

  // If no record exists, insert the new data
  const result = await salaryAndmonth.insertOne({
    ...roomData,
    month: month,
    year: year
  });
  res.send(result);
});


app.get('/salary/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const result = await salaryAndmonth.find({ email }).toArray(); // Assuming MongoDB, converting to array
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Internal Server Error', error });
  }
});


//  // get a user info by email from db
//  app.get('/signUpUsers/:email', async (req, res) => {
//   const email = req.params.email
//   const result = await signUpUser.findOne({ email })
//   res.send(result)
// })





    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  
  }
}
run().catch(console.dir);
