const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();

// --- 1. SETTINGS & MIDDLEWARE ---
const MY_PASSWORD = "Jesusislord1995";
const WHATSAPP = "2349127603945";
const MONGO_URI = "mongodb+srv://boyie007:Jesusislord1995@cluster0.wkkksmf.mongodb.net/?retryWrites=true&w=majority";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 2. DATABASE ---
mongoose.connect(MONGO_URI).then(() => console.log("✅ Database Connected"));
const Product = mongoose.model('Product', { name: String, price: Number, image: String });

// --- 3. CLOUDINARY ---
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

// --- 4. IMPROVED SECURITY CHECK ---
const isAdmin = (req, res, next) => {
    const queryPwd = req.query ? req.query.pwd : null;
    const bodyPwd = req.body ? req.body.pwd : null;
    const referer = req.get('Referer') || "";
    
    // Check URL, Form Body, or if you just came from the Admin page
    const provided = (queryPwd || bodyPwd || "").toString().trim();

    if (provided === MY_PASSWORD || referer.includes(`pwd=${MY_PASSWORD}`)) {
        return next();
    }
    res.status(403).send(`<h1>Access Denied</h1><p>Incorrect Password.</p><a href="/admin?pwd=${MY_PASSWORD}">Click here to Login</a>`);
};

// --- 5. ROUTES ---

app.get('/', (req, res) => res.redirect('/products'));

app.get('/products', async (req, res) => {
    const products = await Product.find();
    const cards = products.map(p => `
        <div style="border:1px solid #ddd; border-radius:15px; padding:15px; background:white; text-align:center; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <img src="${p.image}" style="width:100%; height:200px; object-fit:cover; border-radius:10px;">
            <h3 style="margin:10px 0;">${p.name}</h3>
            <p style="font-weight:bold; color:#4f46e5; font-size:1.2rem;">₦${Number(p.price).toLocaleString()}</p>
            <a href="https://wa.me/${WHATSAPP}?text=I+want+to+buy+${p.name}" style="background:#25D366; color:white; padding:12px; display:block; border-radius:10px; text-decoration:none; font-weight:bold; margin-top:10px;">Order on WhatsApp</a>
        </div>`).join('');
    res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 p-6">
        <h1 class="text-3xl font-black mb-8 text-center">WHOLESALE CONNECT</h1>
        <div class="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${cards || '<p class="text-center w-full col-span-4">No products yet. Go to admin to add some!</p>'}</div>
    </body></html>`);
});

app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    const rows = products.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #eee; background:white;">
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${p.image}" style="width:40px; height:40px; border-radius:5px; object-fit:cover;">
                <span style="font-weight:600;">${p.name}</span>
            </div>
            <form action="/delete" method="POST" style="margin:0;">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                <input type="hidden" name="id" value="${p._id}">
                <button style="color:#ef4444; font-weight:bold; border:none; background:none; cursor:pointer;">Delete</button>
            </form>
        </div>`).join('');

    res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="p-8 bg-gray-100"><div class="max-w-md mx-auto">
        <div class="bg-white p-6 rounded-3xl shadow-lg mb-8">
            <h2 class="text-xl font-bold mb-4">Add New Product</h2>
            <form action="/add" method="POST" enctype="multipart/form-data" class="space-y-4">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                <input name="itemName" placeholder="Product Name" class="w-full border p-3 rounded-xl" required>
                <input type="number" name="itemPrice" placeholder="Price (Naira)" class="w-full border p-3 rounded-xl" required>
                <input type="file" name="itemImage" class="w-full border p-3 rounded-xl" accept="image/*" required>
                <button class="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg hover:bg-gray-800">Upload Product</button>
            </form>
        </div>
        <div class="bg-white rounded-3xl shadow overflow-hidden">${rows}</div>
    </div></body></html>`);
});

app.post('/add', isAdmin, upload.single('itemImage'), async (req, res) => {
    try {
        if(!req.file) throw new Error("Please select an image file");
        await new Product({ name: req.body.itemName, price: req.body.itemPrice, image: req.file.path }).save();
        res.redirect('/admin?pwd=' + MY_PASSWORD);
    } catch (err) {
        res.status(500).send("Upload Error: " + err.message);
    }
});

app.post('/delete', isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.body.id);
    res.redirect('/admin?pwd=' + MY_PASSWORD);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Server running on port ' + PORT));