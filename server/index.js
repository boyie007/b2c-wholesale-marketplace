const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();

// --- 1. SECURE CONFIG ---
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
const Product = mongoose.model('Product', { 
    name: String, 
    price: Number, 
    image: String,
    category: String 
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'wholesale_connect', allowed_formats: ['jpg', 'png', 'jpeg'] },
});
const upload = multer({ storage: storage });

// --- 4. SECURITY ---
const isAdmin = (req, res, next) => {
    const provided = (req.query.pwd || req.body.pwd || "").toString().trim();
    if (provided === MY_PASSWORD || (req.get('Referer') || "").includes(`pwd=${MY_PASSWORD}`)) return next();
    res.status(403).send("<h1>Restricted Access</h1>");
};

// --- 5. STYLES & UI ---
const SHARED_CSS = `
    <style>
        :root { --primary: #000; --bg: #f8f9fa; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); margin:0; color: #1a1a1a; }
        .nav-bar { background: white; padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #eee; position: sticky; top:0; z-index: 100; }
        .logo-area { display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 20px; letter-spacing: -0.5px; }
        .logo-circle { width: 35px; height: 35px; background: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; }
        .container { max-width: 1000px; margin: auto; padding: 20px; }
        .search-box { width: 100%; padding: 15px; border-radius: 12px; border: 1px solid #ddd; margin: 20px 0; font-size: 16px; box-sizing: border-box; }
        .cat-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 15px; scrollbar-width: none; }
        .cat-btn { padding: 8px 18px; border-radius: 20px; border: 1px solid #ddd; background: white; text-decoration: none; color: black; font-size: 14px; white-space: nowrap; }
        .cat-btn.active { background: black; color: white; border-color: black; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .card img { width: 100%; height: 200px; object-fit: cover; }
        .card-body { padding: 15px; }
        .btn-buy { background: #25D366; color: white; text-decoration: none; padding: 10px; border-radius: 8px; display: block; text-align: center; font-weight: bold; margin-top: 10px; }
    </style>
`;

app.get('/products', async (req, res) => {
    const { q, cat } = req.query;
    let query = {};
    if (q) query.name = { $regex: q, $options: 'i' };
    if (cat && cat !== 'All') query.category = cat;

    const products = await Product.find(query);
    const categories = ['All', 'Electronics', 'Fashion', 'Home', 'Beauty'];

    const catHtml = categories.map(c => `
        <a href="/products?cat=${c}" class="cat-btn ${(cat === c || (!cat && c === 'All')) ? 'active' : ''}">${c}</a>
    `).join('');

    const productHtml = products.map(p => `
        <div class="card">
            <img src="${p.image}">
            <div class="card-body">
                <small style="color:gray">${p.category || 'General'}</small>
                <h3 style="margin:5px 0; font-size:16px;">${p.name}</h3>
                <b>₦${Number(p.price).toLocaleString()}</b>
                <a href="https://wa.me/${WHATSAPP}?text=Hello,+I+want+to+order+${p.name}" class="btn-buy">Order on WhatsApp</a>
            </div>
        </div>
    `).join('');

    res.send(`
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                ${SHARED_CSS}
            </head>
            <body>
                <div class="nav-bar">
                    <div class="logo-area">
                        <div class="logo-circle">WC</div>
                        <span>Wholesale Connect</span>
                    </div>
                </div>
                <div class="container">
                    <form action="/products" method="GET">
                        <input name="q" class="search-box" placeholder="Search for items..." value="${q || ''}">
                    </form>
                    <div class="cat-scroll">${catHtml}</div>
                    <div class="product-grid">${productHtml || '<p>No items found.</p>'}</div>
                </div>
            </body>
        </html>
    `);
});

// Admin Dashboard
app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    const listHtml = products.map(p => `
        <div style="display:flex; justify-content:space-between; padding:15px; background:white; margin-bottom:5px; border-radius:10px;">
            <span>${p.name}</span>
            <form action="/delete" method="POST" style="margin:0;">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}"><input type="hidden" name="productId" value="${p._id}">
                <button style="color:red; border:none; background:none; cursor:pointer;">Delete</button>
            </form>
        </div>
    `).join('');

    res.send(`
        <html>
            <head><meta name="viewport" content="width=device-width, initial-scale=1">${SHARED_CSS}</head>
            <body style="padding:20px;">
                <div style="max-width:400px; margin:auto;">
                    <div class="logo-area" style="margin-bottom:20px;">
                        <div class="logo-circle">WC</div> Admin Portal
                    </div>
                    <div style="background:white; padding:20px; border-radius:15px; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                        <form action="/add" method="POST" enctype="multipart/form-data">
                            <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                            <input name="itemName" placeholder="Item Name" class="search-box" style="margin:0 0 10px 0;" required>
                            <input type="number" name="itemPrice" placeholder="Price" class="search-box" style="margin:0 0 10px 0;" required>
                            <select name="itemCategory" class="search-box" style="margin:0 0 10px 0;">
                                <option>Electronics</option><option>Fashion</option><option>Home</option><option>Beauty</option>
                            </select>
                            <input type="file" name="itemImage" style="margin-bottom:15px;" required>
                            <button style="width:100%; background:black; color:white; padding:15px; border:none; border-radius:10px; font-weight:bold;">Upload to Shop</button>
                        </form>
                    </div>
                    <h3 style="margin-top:30px;">Live Inventory</h3>
                    ${listHtml}
                </div>
            </body>
        </html>
    `);
});

app.post('/add', isAdmin, upload.single('itemImage'), async (req, res) => {
    await new Product({ name: req.body.itemName, price: req.body.itemPrice, category: req.body.itemCategory, image: req.file.path }).save();
    res.redirect('/admin?pwd=' + MY_PASSWORD);
});

app.post('/delete', isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.body.productId);
    res.redirect('/admin?pwd=' + MY_PASSWORD);
});

app.get('/', (req, res) => res.redirect('/products'));
app.listen(process.env.PORT || 3000);