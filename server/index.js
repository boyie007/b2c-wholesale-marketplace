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

// --- 2. CLOUDINARY CONFIG ---
const rawUrl = process.env.CLOUDINARY_URL || "";
if (rawUrl.includes('://')) {
    const parts = rawUrl.split('://')[1].split('@');
    const auth = parts[0].split(':');
    const cloudName = parts[1];
    cloudinary.config({ cloud_name: cloudName, api_key: auth[0], api_secret: auth[1], secure: true });
}

// --- 3. DATABASE ---
mongoose.connect(MONGO_URI).then(() => console.log("✅ DB Connected"));
const Product = mongoose.model('Product', { name: String, price: Number, image: String });

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'wholesale_connect', allowed_formats: ['jpg', 'png', 'jpeg'] },
});
const upload = multer({ storage: storage });

// --- 4. SECURITY ---
const isAdmin = (req, res, next) => {
    const provided = (req.query.pwd || req.body.pwd || "").toString().trim();
    const referer = (req.get('Referer') || "");
    if (provided === MY_PASSWORD || referer.includes(`pwd=${MY_PASSWORD}`)) return next();
    res.status(403).send("Access Denied.");
};

// --- 5. ROUTES ---

// Customer View
app.get('/', (req, res) => res.redirect('/products'));
app.get('/products', async (req, res) => {
    const products = await Product.find();
    const cards = products.map(p => `
        <div style="border:1px solid #eee; border-radius:15px; padding:15px; background:white; text-align:center; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
            <img src="${p.image}" style="width:100%; height:180px; object-fit:cover; border-radius:10px;">
            <h3 style="margin:10px 0;">${p.name}</h3>
            <p style="font-weight:bold; color:#4f46e5; font-size:1.1rem;">₦${Number(p.price).toLocaleString()}</p>
            <a href="https://wa.me/${WHATSAPP}?text=I+want+to+buy+${p.name}" style="background:#25D366; color:white; padding:10px; display:block; border-radius:10px; text-decoration:none; margin-top:10px; font-weight:bold;">Order on WhatsApp</a>
        </div>`).join('');
    res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:sans-serif; background:#f9fafb; padding:20px;"><h1 style="text-align:center; font-weight:900;">WHOLESALE CONNECT</h1><div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:20px; max-width:1200px; margin:auto;">${cards || "No products yet."}</div></body></html>`);
});

// Admin Dashboard with Delete
app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    const rows = products.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #eee;">
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${p.image}" style="width:40px; height:40px; border-radius:5px; object-fit:cover;">
                <span>${p.name}</span>
            </div>
            <form action="/delete" method="POST" onsubmit="return confirm('Delete this item?');" style="margin:0;">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                <input type="hidden" name="productId" value="${p._id}">
                <button style="background:none; border:none; color:red; cursor:pointer; font-weight:bold;">Delete</button>
            </form>
        </div>`).join('');

    res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:sans-serif; background:#f3f4f6; padding:20px;">
        <div style="max-width:500px; margin:auto; background:white; padding:25px; border-radius:20px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
            <h2 style="margin-top:0;">Add New Product</h2>
            <form action="/add" method="POST" enctype="multipart/form-data">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                <input name="itemName" placeholder="Product Name" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ccc; border-radius:8px;" required>
                <input type="number" name="itemPrice" placeholder="Price (Naira)" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ccc; border-radius:8px;" required>
                <input type="file" name="itemImage" style="margin-bottom:20px;" required>
                <button style="width:100%; background:black; color:white; padding:15px; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">Upload Product</button>
            </form>
            <h2 style="margin-top:30px;">Manage Products</h2>
            <div style="border:1px solid #eee; border-radius:10px;">${rows || '<p style="padding:15px;">No products yet.</p>'}</div>
        </div>
    </body></html>`);
});

// Add Product
app.post('/add', isAdmin, upload.single('itemImage'), async (req, res) => {
    try {
        await new Product({ name: req.body.itemName, price: req.body.itemPrice, image: req.file.path }).save();
        res.redirect('/admin?pwd=' + MY_PASSWORD);
    } catch (err) { res.status(500).send("Error: " + err.message); }
});

// Delete Product
app.post('/delete', isAdmin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.body.productId);
        res.redirect('/admin?pwd=' + MY_PASSWORD);
    } catch (err) { res.status(500).send("Error: " + err.message); }
});

app.listen(process.env.PORT || 3000);