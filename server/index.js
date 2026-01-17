const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();

// --- 1. SETTINGS ---
const MY_PASSWORD = "Jesusislord1995";
const WHATSAPP = "2349127603945";
const MONGO_URI = "mongodb+srv://boyie007:Jesusislord1995@cluster0.wkkksmf.mongodb.net/?retryWrites=true&w=majority";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 2. DATABASE ---
mongoose.connect(MONGO_URI).then(() => console.log("✅ DB Connected"));
const Product = mongoose.model('Product', { name: String, price: Number, image: String });

// --- 3. CLOUDINARY (Uses Render Env Vars) ---
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

// --- 4. SECURITY ---
const isAdmin = (req, res, next) => {
    const queryPwd = req.query ? req.query.pwd : null;
    const bodyPwd = req.body ? req.body.pwd : null;
    const referer = req.get('Referer') || "";
    const provided = (queryPwd || bodyPwd || "").toString().trim();

    if (provided === MY_PASSWORD || referer.includes(`pwd=${MY_PASSWORD}`)) {
        return next();
    }
    res.status(403).send("Access Denied. Use the correct link.");
};

// --- 5. ROUTES ---

app.get('/', (req, res) => res.redirect('/products'));

app.get('/products', async (req, res) => {
    const products = await Product.find();
    const cards = products.map(p => `
        <div style="border:1px solid #ddd; border-radius:15px; padding:15px; background:white; text-align:center;">
            <img src="${p.image}" style="width:100%; height:200px; object-fit:cover; border-radius:10px;">
            <h3>${p.name}</h3>
            <p style="font-weight:bold; color:#4f46e5;">₦${Number(p.price).toLocaleString()}</p>
            <a href="https://wa.me/${WHATSAPP}?text=I+want+to+buy+${p.name}" style="background:#25D366; color:white; padding:10px; display:block; border-radius:10px; text-decoration:none; font-weight:bold;">Order</a>
        </div>`).join('');
    res.send(`<html><body style="font-family:sans-serif; background:#f9fafb; padding:20px;">
        <h1 style="text-align:center;">WHOLESALE CONNECT</h1>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:20px; max-width:1200px; margin:auto;">${cards}</div>
    </body></html>`);
});

app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    const rows = products.map(p => `<div style="padding:10px; border-bottom:1px solid #eee;">${p.name}</div>`).join('');
    res.send(`<html><body style="font-family:sans-serif; padding:40px; background:#f3f4f6;">
        <div style="max-width:400px; margin:auto; background:white; padding:30px; border-radius:20px; shadow:lg;">
            <h2>Add Product</h2>
            <form action="/add" method="POST" enctype="multipart/form-data">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                <input name="itemName" placeholder="Name" style="width:100%; margin-bottom:10px; padding:10px;" required>
                <input type="number" name="itemPrice" placeholder="Price" style="width:100%; margin-bottom:10px; padding:10px;" required>
                <input type="file" name="itemImage" style="width:100%; margin-bottom:20px;" required>
                <button style="width:100%; background:black; color:white; padding:15px; border-radius:10px; font-weight:bold;">Upload Product</button>
            </form>
            <div style="margin-top:30px;">${rows}</div>
        </div>
    </body></html>`);
});

app.post('/add', isAdmin, upload.single('itemImage'), async (req, res) => {
    try {
        if (!req.file) throw new Error("Image upload failed at Cloudinary. Check your API Keys.");
        await new Product({ name: req.body.itemName, price: req.body.itemPrice, image: req.file.path }).save();
        res.redirect('/admin?pwd=' + MY_PASSWORD);
    } catch (err) {
        // This will show the REAL error message now
        res.status(500).send(`<h1>Upload Error</h1><p>${err.message}</p><a href="/admin?pwd=${MY_PASSWORD}">Try Again</a>`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Running'));