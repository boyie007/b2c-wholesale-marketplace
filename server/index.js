const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();

// --- 1. CRITICAL MIDDLEWARE (MUST BE AT THE TOP) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 2. CONFIGURATION ---
const MY_PASSWORD = "Jesusislord1995";
const WHATSAPP = "2349127603945";
const MONGO_URI = "mongodb+srv://boyie007:Jesusislord1995@cluster0.wkkksmf.mongodb.net/?retryWrites=true&w=majority";

// --- 3. DATABASE ---
mongoose.connect(MONGO_URI).then(() => console.log("✅ Database Connected"));
const Product = mongoose.model('Product', { name: String, price: Number, image: String });

// --- 4. CLOUDINARY SETUP ---
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET 
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'wholesale_connect', allowed_formats: ['jpg', 'png', 'jpeg'] },
});
const upload = multer({ storage: storage });

// --- 5. THE SECURITY CHECK ---
const isAdmin = (req, res, next) => {
    // We check both the URL (?pwd=) and the hidden form field (req.body.pwd)
    const queryPwd = req.query ? req.query.pwd : null;
    const bodyPwd = req.body ? req.body.pwd : null;
    const provided = (queryPwd || bodyPwd || "").toString().trim();

    if (provided === MY_PASSWORD) {
        return next();
    }
    res.status(403).send(`
        <div style="text-align:center; padding:50px; font-family:sans-serif;">
            <h1 style="color:red;">403 Forbidden</h1>
            <p>Incorrect Password. Current attempt: "<b>${provided}</b>"</p>
            <a href="/admin?pwd=${MY_PASSWORD}" style="background:black; color:white; padding:10px; text-decoration:none; border-radius:5px;">Login with Link</a>
        </div>
    `);
};

// --- 6. ROUTES ---

// Redirect Home to Products
app.get('/', (req, res) => res.redirect('/products'));

// Product Gallery
app.get('/products', async (req, res) => {
    const products = await Product.find();
    const cards = products.map(p => `
        <div style="border:1px solid #ddd; border-radius:15px; padding:15px; background:white; text-align:center;">
            <img src="${p.image}" style="width:100%; height:200px; object-fit:cover; border-radius:10px;">
            <h3>${p.name}</h3>
            <p style="font-weight:bold; color:indigo;">₦${Number(p.price).toLocaleString()}</p>
            <a href="https://wa.me/${WHATSAPP}?text=I+want+to+buy+${p.name}" style="background:#25D366; color:white; padding:10px; display:block; border-radius:10px; text-decoration:none; font-weight:bold;">Order on WhatsApp</a>
        </div>`).join('');
    res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 p-6">
        <h1 class="text-3xl font-black mb-8">WHOLESALE CONNECT</h1>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${cards}</div>
    </body></html>`);
});

// Admin Dashboard
app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    const rows = products.map(p => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span>${p.name}</span>
            <form action="/delete" method="POST" style="margin:0;">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                <input type="hidden" name="id" value="${p._id}">
                <button style="color:red; font-weight:bold;">Delete</button>
            </form>
        </div>`).join('');

    res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="p-8 bg-gray-100"><div class="max-w-md mx-auto bg-white p-6 rounded-3xl shadow-lg">
        <h2 class="text-xl font-bold mb-4">Add New Product</h2>
        <form action="/add" method="POST" enctype="multipart/form-data" class="space-y-4">
            <input type="hidden" name="pwd" value="${MY_PASSWORD}">
            <input name="itemName" placeholder="Product Name" class="w-full border p-3 rounded-xl" required>
            <input type="number" name="itemPrice" placeholder="Price (Naira)" class="w-full border p-3 rounded-xl" required>
            <input type="file" name="itemImage" class="w-full border p-3 rounded-xl" accept="image/*" required>
            <button class="w-full bg-black text-white py-3 rounded-xl font-bold">Upload Product</button>
        </form>
        <div class="mt-8">${rows}</div>
    </div></body></html>`);
});

// Add Product Action
app.post('/add', isAdmin, upload.single('itemImage'), async (req, res) => {
    try {
        await new Product({ 
            name: req.body.itemName, 
            price: req.body.itemPrice, 
            image: req.file.path 
        }).save();
        res.redirect('/admin?pwd=' + MY_PASSWORD);
    } catch (err) {
        res.status(500).send("Upload Error: " + err.message);
    }
});

// Delete Product Action
app.post('/delete', isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.body.id);
    res.redirect('/admin?pwd=' + MY_PASSWORD);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Server is running on port ' + PORT));