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

// --- 3. CLOUDINARY (Safe Version) ---
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ 
    cloudinary_url: process.env.CLOUDINARY_URL.trim() 
  });
} else {
  console.error("❌ CLOUDINARY_URL is missing from Render Environment Variables!");
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'wholesale_connect', allowed_formats: ['jpg', 'png', 'jpeg'] },
});
const upload = multer({ storage: storage });

// --- 4. SECURITY ---
const isAdmin = (req, res, next) => {
    const provided = (req.query.pwd || req.body.pwd || "").toString().trim();
    const referer = req.get('Referer') || "";
    if (provided === MY_PASSWORD || referer.includes(`pwd=${MY_PASSWORD}`)) return next();
    res.status(403).send("Access Denied.");
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
            <a href="https://wa.me/${WHATSAPP}?text=I+buy+${p.name}" style="background:#25D366; color:white; padding:10px; display:block; border-radius:10px; text-decoration:none;">Order</a>
        </div>`).join('');
    res.send(`<html><body style="font-family:sans-serif; background:#f9fafb; padding:20px;">
        <h1 style="text-align:center;">WHOLESALE CONNECT</h1>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:20px;">${cards}</div>
    </body></html>`);
});

app.get('/admin', isAdmin, async (req, res) => {
    res.send(`<html><body style="font-family:sans-serif; padding:40px;">
        <form action="/add" method="POST" enctype="multipart/form-data" style="max-width:300px; margin:auto;">
            <h2>Add Product</h2>
            <input type="hidden" name="pwd" value="${MY_PASSWORD}">
            <input name="itemName" placeholder="Name" style="width:100%; margin-bottom:10px;" required>
            <input type="number" name="itemPrice" placeholder="Price" style="width:100%; margin-bottom:10px;" required>
            <input type="file" name="itemImage" style="width:100%; margin-bottom:20px;" required>
            <button style="width:100%; background:black; color:white; padding:10px;">Upload</button>
        </form>
    </body></html>`);
});

app.post('/add', isAdmin, upload.single('itemImage'), async (req, res) => {
    try {
        await new Product({ name: req.body.itemName, price: req.body.itemPrice, image: req.file.path }).save();
        res.redirect('/admin?pwd=' + MY_PASSWORD);
    } catch (err) {
        res.status(500).send("Upload Error: " + err.message);
    }
});

app.listen(process.env.PORT || 3000);