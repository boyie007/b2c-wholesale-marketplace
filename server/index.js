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
    res.status(403).send("<h1>Access Denied</h1>");
};

// --- 5. UI STYLES ---
const SHARED_CSS = `
    <style>
        :root { --brand-blue: #007bff; --text-black: #000000; --bg: #f4f7f6; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: var(--bg); margin:0; }
        .nav-bar { background: white; padding: 20px; display: flex; align-items: center; border-bottom: 2px solid #eee; position: sticky; top:0; z-index: 1000; }
        .logo-placeholder { width: 40px; height: 40px; background: var(--brand-blue); border-radius: 10px; margin-right: 12px; }
        .brand-name { color: var(--text-black); font-size: 22px; font-weight: 900; letter-spacing: -1px; }
        .container { max-width: 1100px; margin: auto; padding: 20px; }
        .search-container { position: relative; margin: 20px 0; }
        .search-bar { width: 100%; padding: 15px 20px; border-radius: 30px; border: 1px solid #ddd; font-size: 16px; outline: none; transition: 0.3s; }
        .search-bar:focus { border-color: var(--brand-blue); box-shadow: 0 0 10px rgba(0,123,255,0.1); }
        .cat-scroll { display: flex; gap: 10px; overflow-x: auto; padding: 10px 0 20px 0; scrollbar-width: none; }
        .cat-btn { padding: 10px 20px; background: white; border: 1px solid #ddd; border-radius: 25px; text-decoration: none; color: #555; font-size: 14px; white-space: nowrap; transition: 0.2s; }
        .cat-btn.active { background: var(--brand-blue); color: white; border-color: var(--brand-blue); font-weight: bold; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 25px; }
        .product-card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05); transition: 0.3s; }
        .product-card:hover { transform: translateY(-5px); }
        .product-img { width: 100%; height: 220px; object-fit: cover; }
        .details { padding: 20px; }
        .price { font-size: 20px; font-weight: 900; color: var(--text-black); display: block; margin-top: 10px; }
        .buy-btn { background: #25D366; color: white; text-decoration: none; display: block; text-align: center; padding: 12px; border-radius: 12px; margin-top: 15px; font-weight: bold; font-size: 14px; }
    </style>
`;

// --- 6. ROUTES ---

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
        <div class="product-card">
            <img src="${p.image}" class="product-img">
            <div class="details">
                <span style="color:var(--brand-blue); font-size:12px; font-weight:bold; text-transform:uppercase;">${p.category || 'WHOLESALE'}</span>
                <h3 style="margin:5px 0; font-size:17px; color:#333;">${p.name}</h3>
                <span class="price">₦${Number(p.price).toLocaleString()}</span>
                <a href="https://wa.me/${WHATSAPP}?text=I+am+interested+in+${p.name}" class="buy-btn">Order via WhatsApp</a>
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
                    <div class="logo-placeholder"></div>
                    <div class="brand-name">Wholesale Connect</div>
                </div>
                <div class="container">
                    <form action="/products" method="GET" class="search-container">
                        <input name="q" class="search-bar" placeholder="What are you looking for?" value="${q || ''}">
                    </form>
                    <div class="cat-scroll">${catHtml}</div>
                    <div class="grid">${productHtml || '<p style="text-align:center; width:100%;">No products found.</p>'}</div>
                </div>
            </body>
        </html>
    `);
});

// Admin Dashboard
app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    const rows = products.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:15px; margin-bottom:10px; border-radius:15px; border:1px solid #eee;">
            <div style="display:flex; align-items:center;">
                <img src="${p.image}" style="width:40px; height:40px; object-fit:cover; border-radius:8px; margin-right:10px;">
                <span style="font-weight:bold;">${p.name}</span>
            </div>
            <form action="/delete" method="POST" onsubmit="return confirm('Delete this item?')" style="margin:0;">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}"><input type="hidden" name="productId" value="${p._id}">
                <button style="color:red; background:none; border:none; font-weight:bold; cursor:pointer;">Delete</button>
            </form>
        </div>`).join('');

    res.send(`
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1">${SHARED_CSS}</head>
        <body style="padding:20px;">
            <div style="max-width:450px; margin:auto;">
                <div class="nav-bar" style="border:none; background:none; padding:0; margin-bottom:30px;">
                    <div class="logo-placeholder"></div>
                    <div class="brand-name">Admin Portal</div>
                </div>
                <div style="background:white; padding:25px; border-radius:25px; box-shadow:0 10px 30px rgba(0,0,0,0.05);">
                    <form action="/add" method="POST" enctype="multipart/form-data">
                        <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                        <input name="itemName" placeholder="Item Name" style="width:100%; padding:15px; margin-bottom:15px; border-radius:12px; border:1px solid #ddd;" required>
                        <input type="number" name="itemPrice" placeholder="Price (₦)" style="width:100%; padding:15px; margin-bottom:15px; border-radius:12px; border:1px solid #ddd;" required>
                        <select name="itemCategory" style="width:100%; padding:15px; margin-bottom:15px; border-radius:12px; border:1px solid #ddd;">
                            <option>Electronics</option><option>Fashion</option><option>Home</option><option>Beauty</option>
                        </select>
                        <input type="file" name="itemImage" style="margin-bottom:20px;" required>
                        <button style="width:100%; background:var(--text-black); color:white; padding:18px; border:none; border-radius:15px; font-weight:bold; cursor:pointer;">List Product</button>
                    </form>
                </div>
                <h2 style="margin-top:40px; font-size:18px;">Inventory Control</h2>
                ${rows}
            </div>
        </body></html>
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