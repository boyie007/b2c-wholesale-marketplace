const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();

// --- 1. SECURE CONFIGURATION ---
const MY_PASSWORD = process.env.ADMIN_PASSWORD || "Jesusislord1995";
const WHATSAPP = process.env.WHATSAPP_NUMBER || "2349127603945";
const MONGO_URI = process.env.MONGO_URI; 

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

// --- 4. SECURITY MIDDLEWARE ---
const isAdmin = (req, res, next) => {
    const provided = (req.query.pwd || req.body.pwd || "").toString().trim();
    const referer = (req.get('Referer') || "");
    if (provided === MY_PASSWORD || referer.includes(`pwd=${MY_PASSWORD}`)) return next();
    res.status(403).send(`<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;"><div><h1>🔐 Restricted Access</h1><p>Please use your secure admin link.</p></div></body>`);
};

// --- 5. MODERN UI/X ROUTES ---

// Main Shop Page
app.get('/products', async (req, res) => {
    const products = await Product.find();
    const cards = products.map(p => `
        <div style="background:white; border-radius:24px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.05); transition: transform 0.2s;">
            <img src="${p.image}" style="width:100%; height:220px; object-fit:cover;">
            <div style="padding:20px; text-align:left;">
                <h3 style="margin:0; font-size:1.1rem; color:#1f2937; font-weight:700;">${p.name}</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                    <span style="font-size:1.25rem; font-weight:900; color:#000;">₦${Number(p.price).toLocaleString()}</span>
                    <a href="https://wa.me/${WHATSAPP}?text=I+want+to+buy+${p.name}" style="background:#000; color:#fff; padding:10px 18px; border-radius:12px; text-decoration:none; font-size:0.9rem; font-weight:700;">Order</a>
                </div>
            </div>
        </div>`).join('');

    res.send(`
    <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background:#fbfbfd; color:#1d1d1f; margin:0; padding:20px; }
                .header { max-width:1200px; margin: 40px auto; text-align:left; }
                .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:25px; max-width:1200px; margin:auto; }
                h1 { font-size:3rem; font-weight:800; letter-spacing:-1px; margin-bottom:10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Wholesale Connect.</h1>
                <p style="color:#86868b; font-size:1.2rem;">Premium items at wholesale rates.</p>
            </div>
            <div class="grid">${cards || "Our catalog is being updated..."}</div>
        </body>
    </html>`);
});

// Admin Page (Simplified & Dark Mode UI)
app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    const rows = products.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; background:#fff; margin-bottom:10px; border-radius:16px; border:1px solid #e5e7eb;">
            <div style="display:flex; align-items:center; gap:12px;">
                <img src="${p.image}" style="width:48px; height:48px; border-radius:10px; object-fit:cover;">
                <span style="font-weight:600;">${p.name}</span>
            </div>
            <form action="/delete" method="POST" onsubmit="return confirm('Delete?');" style="margin:0;">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}"><input type="hidden" name="productId" value="${p._id}">
                <button style="background:#fee2e2; color:#ef4444; border:none; padding:8px 14px; border-radius:8px; font-weight:700; cursor:pointer;">Delete</button>
            </form>
        </div>`).join('');

    res.send(`
    <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:sans-serif; background:#f9fafb; padding:20px;">
            <div style="max-width:450px; margin:auto;">
                <div style="background:#000; color:#fff; padding:30px; border-radius:28px; margin-bottom:20px;">
                    <h2 style="margin:0 0 20px 0;">Add Product</h2>
                    <form action="/add" method="POST" enctype="multipart/form-data">
                        <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                        <input name="itemName" placeholder="Product Name" style="width:100%; padding:14px; margin-bottom:12px; border-radius:12px; border:none;" required>
                        <input type="number" name="itemPrice" placeholder="Price (₦)" style="width:100%; padding:14px; margin-bottom:12px; border-radius:12px; border:none;" required>
                        <input type="file" name="itemImage" style="margin-bottom:20px; color:#fff;" required>
                        <button style="width:100%; background:#fff; color:#000; padding:16px; border:none; border-radius:14px; font-weight:800; cursor:pointer;">Publish Now</button>
                    </form>
                </div>
                ${rows}
            </div>
        </body>
    </html>`);
});

app.get('/', (req, res) => res.redirect('/products'));
app.post('/add', isAdmin, upload.single('itemImage'), async (req, res) => {
    await new Product({ name: req.body.itemName, price: req.body.itemPrice, image: req.file.path }).save();
    res.redirect('/admin?pwd=' + MY_PASSWORD);
});
app.post('/delete', isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.body.productId);
    res.redirect('/admin?pwd=' + MY_PASSWORD);
});

app.listen(process.env.PORT || 3000);