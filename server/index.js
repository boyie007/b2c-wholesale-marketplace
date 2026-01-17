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

// --- 3. DATABASE (Now includes Category) ---
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

// --- 5. UI ROUTES ---

app.get('/products', async (req, res) => {
    const { q, cat } = req.query;
    let query = {};
    if (q) query.name = { $regex: q, $options: 'i' };
    if (cat && cat !== 'All') query.category = cat;

    const products = await Product.find(query);
    const categories = ['All', 'Electronics', 'Fashion', 'Home', 'Beauty', 'Others'];

    const catButtons = categories.map(c => `
        <a href="/products?cat=${c}" style="padding:10px 20px; background:${cat === c || (!cat && c === 'All') ? '#000' : '#fff'}; color:${cat === c || (!cat && c === 'All') ? '#fff' : '#000'}; border-radius:30px; text-decoration:none; border:1px solid #eee; font-size:14px; white-space:nowrap;">${c}</a>
    `).join('');

    const cards = products.map(p => `
        <div style="background:white; border-radius:20px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.05);">
            <img src="${p.image}" style="width:100%; height:200px; object-fit:cover;">
            <div style="padding:15px;">
                <span style="font-size:12px; color:gray; text-transform:uppercase;">${p.category || 'General'}</span>
                <h3 style="margin:5px 0; font-size:16px;">${p.name}</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                    <b style="font-size:18px;">₦${Number(p.price).toLocaleString()}</b>
                    <a href="https://wa.me/${WHATSAPP}?text=I+want+to+buy+${p.name}" style="background:#25D366; color:white; padding:8px 15px; border-radius:10px; text-decoration:none; font-weight:bold; font-size:13px;">Order</a>
                </div>
            </div>
        </div>`).join('');

    res.send(`
    <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:sans-serif; background:#f9fafb; margin:0; padding:20px;">
            <div style="max-width:1100px; margin:auto;">
                <h1 style="font-size:28px; font-weight:900;">Marketplace</h1>
                
                <form action="/products" method="GET" style="margin:20px 0; display:flex; gap:10px;">
                    <input name="q" value="${q || ''}" placeholder="Search products..." style="flex:1; padding:15px; border-radius:15px; border:1px solid #ddd; outline:none;">
                    <button style="padding:15px 25px; background:black; color:white; border-radius:15px; border:none; cursor:pointer; font-weight:bold;">Search</button>
                </form>

                <div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:10px; margin-bottom:20px; scrollbar-width: none;">${catButtons}</div>

                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:20px;">
                    ${cards || "<p>No products found.</p>"}
                </div>
            </div>
        </body>
    </html>`);
});

// Admin Dashboard
app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    const rows = products.map(p => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span>${p.name} (${p.category})</span>
            <form action="/delete" method="POST" style="margin:0;">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}"><input type="hidden" name="productId" value="${p._id}">
                <button style="color:red; background:none; border:none; cursor:pointer;">Delete</button>
            </form>
        </div>`).join('');

    res.send(`
    <html><body style="font-family:sans-serif; background:#f3f4f6; padding:20px;">
        <div style="max-width:450px; margin:auto; background:white; padding:25px; border-radius:20px;">
            <h2>Add Product</h2>
            <form action="/add" method="POST" enctype="multipart/form-data">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                <input name="itemName" placeholder="Name" style="width:100%; padding:12px; margin-bottom:10px; border-radius:10px; border:1px solid #ddd;" required>
                <input type="number" name="itemPrice" placeholder="Price" style="width:100%; padding:12px; margin-bottom:10px; border-radius:10px; border:1px solid #ddd;" required>
                <select name="itemCategory" style="width:100%; padding:12px; margin-bottom:10px; border-radius:10px; border:1px solid #ddd;">
                    <option>Electronics</option><option>Fashion</option><option>Home</option><option>Beauty</option><option>Others</option>
                </select>
                <input type="file" name="itemImage" style="margin-bottom:20px;" required>
                <button style="width:100%; padding:15px; background:black; color:white; border-radius:10px; border:none; font-weight:bold;">Publish</button>
            </form>
            <hr style="margin:30px 0; border:0; border-top:1px solid #eee;">
            ${rows}
        </div>
    </body></html>`);
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