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
    res.status(403).send("<h1>Restricted</h1>");
};

// --- 5. UPDATED UI DESIGN WITH ITALIC BRANDING ---
const SHARED_CSS = `
    <style>
        body { font-family: 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; margin:0; }
        .header { background: #fff; padding: 15px 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100; }
        .header-content { max-width: 1200px; margin: auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px; }
        
        /* BRANDING SECTION */
        .brand { display: flex; align-items: center; text-decoration: none; }
        .logo-box { 
            width: 42px; height: 42px; background: #007bff; border-radius: 10px; 
            display: flex; align-items: center; justify-content: center; 
            margin-right: 12px; font-weight: 900; color: white; font-size: 24px; font-style: italic;
        }
        .brand-text { color: #000; font-size: 22px; font-weight: 800; font-style: italic; letter-spacing: -0.5px; }
        
        .search-input { flex-grow: 1; max-width: 400px; padding: 12px 20px; border-radius: 50px; border: 1px solid #ddd; background: #f0f2f5; outline: none; }
        .container { max-width: 1200px; margin: 20px auto; padding: 0 15px; }
        .categories { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; scrollbar-width: none; }
        .cat-link { padding: 8px 18px; background: #fff; border-radius: 20px; text-decoration: none; color: #4b4f56; font-size: 14px; font-weight: 600; border: 1px solid #ddd; }
        .cat-link.active { background: #007bff; color: #fff; border-color: #007bff; }
        
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        .card { background: #fff; border-radius: 15px; overflow: hidden; border: 1px solid #eee; transition: 0.2s; }
        .card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        .card-img { width: 100%; height: 200px; object-fit: cover; }
        .card-info { padding: 15px; }
        .order-btn { background: #25D366; color: #fff; text-decoration: none; display: block; text-align: center; padding: 12px; border-radius: 10px; font-weight: 700; margin-top: 10px; }
    </style>
`;

app.get('/products', async (req, res) => {
    const { q, cat } = req.query;
    let query = {};
    if (q) query.name = { $regex: q, $options: 'i' };
    if (cat && cat !== 'All') query.category = cat;

    const products = await Product.find(query);
    const categories = ['All', 'Electronics', 'Fashion', 'Home', 'Beauty', 'Others'];

    const catHtml = categories.map(c => `<a href="/products?cat=${c}" class="cat-link ${(cat === c || (!cat && c === 'All')) ? 'active' : ''}">${c}</a>`).join('');
    const productsHtml = products.map(p => `
        <div class="card">
            <img src="${p.image}" class="card-img">
            <div class="card-info">
                <small style="color: #007bff; font-weight: 700; text-transform: uppercase; font-size: 10px;">${p.category || 'WHOLESALE'}</small>
                <h3 style="margin: 5px 0; font-size: 16px; color: #1c1e21;">${p.name}</h3>
                <span style="font-size: 18px; font-weight: 800; color: #000;">₦${Number(p.price).toLocaleString()}</span>
                <a href="https://wa.me/${WHATSAPP}?text=Hello,+I+want+to+order+${p.name}" class="order-btn">Order on WhatsApp</a>
            </div>
        </div>`).join('');

    res.send(`
        <html>
            <head><meta name="viewport" content="width=device-width, initial-scale=1">${SHARED_CSS}</head>
            <body>
                <div class="header">
                    <div class="header-content">
                        <a href="/" class="brand">
                            <div class="logo-box">W</div>
                            <span class="brand-text">Wholesale Connect</span>
                        </a>
                        <form action="/products" method="GET" style="flex-grow:1; display:flex; justify-content:center; margin:0;">
                            <input name="q" class="search-input" placeholder="Search marketplace..." value="${q || ''}">
                        </form>
                    </div>
                </div>
                <div class="container">
                    <div class="categories">${catHtml}</div>
                    <div class="product-grid">${productsHtml || 'No products found.'}</div>
                </div>
            </body>
        </html>
    `);
});

// Admin Dashboard
app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    const rows = products.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:15px; margin-bottom:8px; border-radius:12px; border:1px solid #ddd;">
            <span style="font-weight:600;">${p.name}</span>
            <form action="/delete" method="POST" style="margin:0;" onsubmit="return confirm('Delete?')">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}"><input type="hidden" name="productId" value="${p._id}">
                <button style="color:#ff4444; background:none; border:none; font-weight:700; cursor:pointer;">Remove</button>
            </form>
        </div>`).join('');

    res.send(`
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1">${SHARED_CSS}</head>
        <body style="padding:20px;">
            <div style="max-width:450px; margin:auto;">
                <div class="brand" style="justify-content:center; margin-bottom:30px;">
                    <div class="logo-box">W</div><span class="brand-text">Admin</span>
                </div>
                <div style="background:white; padding:25px; border-radius:20px; border:1px solid #ddd;">
                    <form action="/add" method="POST" enctype="multipart/form-data">
                        <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                        <input name="itemName" placeholder="Item Name" style="width:100%; padding:12px; margin-bottom:12px; border-radius:8px; border:1px solid #ddd;" required>
                        <input type="number" name="itemPrice" placeholder="Price (₦)" style="width:100%; padding:12px; margin-bottom:12px; border-radius:8px; border:1px solid #ddd;" required>
                        <select name="itemCategory" style="width:100%; padding:12px; margin-bottom:15px; border-radius:8px; border:1px solid #ddd;">
                            <option>Electronics</option><option>Fashion</option><option>Home</option><option>Beauty</option><option>Others</option>
                        </select>
                        <input type="file" name="itemImage" style="margin-bottom:20px;" required>
                        <button style="width:100%; background:#000; color:#fff; padding:15px; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">List Product</button>
                    </form>
                </div>
                <h3 style="margin-top:40px; color:#1c1e21;">Live Catalog</h3>
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