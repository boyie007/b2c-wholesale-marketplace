const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();
// --- 1. MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 🛠️ CUSTOMIZE YOUR SETTINGS HERE
// ==========================================
const ADMIN_PASSWORD = "Jesusislord1995"; 
const WHATSAPP_NUMBER = "2349127603945"; // Your contact
const MONGO_URI = "mongodb+srv://boyie007:Jesusislord1995@cluster0.wkkksmf.mongodb.net/?retryWrites=true&w=majority";
// ==========================================



// --- 2. DATABASE ---
mongoose.connect(MONGO_URI).then(() => console.log("✅ DB Connected"));

const Product = mongoose.model('Product', {
    name: String, price: Number, category: String, image: String
});

// --- 3. CLOUDINARY (Uses Render Env Vars) ---
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET 
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'wholesale_connect', allowed_formats: ['jpg', 'png'] },
});
const upload = multer({ storage: storage });

// --- 4. SECURITY CHECK ---
const isAdmin = (req, res, next) => {
    // 1. Get password from URL or from a form submission
    const queryPwd = req.query.pwd;
    const bodyPwd = req.body.pwd;
    const providedPwd = (queryPwd || bodyPwd || "").toString().trim();

    // 2. Check against your real password
    if (providedPwd === "Jesusislord1995") {
        return next();
    }
    
    // 3. If it fails, show this screen with a clickable fix
    res.status(403).send(`
        <div style="font-family:sans-serif;text-align:center;margin-top:50px;">
            <h1 style="color:#e11d48;">🔐 Access Denied</h1>
            <p>The password provided ("${providedPwd}") does not match.</p>
            <div style="margin-top:20px; padding:20px; background:#f3f4f6; display:inline-block; border-radius:10px;">
                <p>Click the link below to enter with the correct password:</p>
                <a href="/admin?pwd=Jesusislord1995" 
                   style="background:#000; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">
                   Login to Admin Panel
                </a>
            </div>
        </div>
    `);
};
const formatNaira = (num) => '₦' + Number(num).toLocaleString();

// --- 5. ROUTES ---

// HOME: Redirects straight to products
app.get('/', (req, res) => res.redirect('/products'));

// PRODUCTS PAGE
app.get('/products', async (req, res) => {
  const products = await Product.find();
  const cards = products.map(p => `
    <div class="bg-white rounded-2xl shadow-sm border p-4 flex flex-col">
      <img class="h-48 w-full object-cover rounded-xl mb-4" src="${p.image}">
      <h3 class="font-bold text-gray-800">${p.name}</h3>
      <p class="text-indigo-600 font-black text-xl mb-4">${formatNaira(p.price)}</p>
      <a href="https://wa.me/${WHATSAPP_NUMBER}?text=I want to buy ${p.name}" class="text-center bg-green-500 text-white py-2 rounded-lg font-bold">Order</a>
    </div>`).join('');

  res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-100 p-6"><h1 class="text-2xl font-bold mb-6">WholesaleConnect</h1><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${cards}</div></body></html>`);
});

// ADMIN PAGE
app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    const list = products.map(p => `
        <div class="flex justify-between bg-white p-3 mb-2 rounded border">
            <span>${p.name}</span>
            <form action="/delete" method="POST" class="m-0">
                <input type="hidden" name="pwd" value="${ADMIN_PASSWORD}">
                <input type="hidden" name="id" value="${p._id}">
                <button class="text-red-500 font-bold">Delete</button>
            </form>
        </div>`).join('');
    
    res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="p-6 bg-gray-50"><div class="max-w-md mx-auto">
    <h2 class="text-xl font-bold mb-4">Add Product</h2>
    <form action="/add" method="POST" enctype="multipart/form-data" class="space-y-3 bg-white p-6 rounded-xl shadow">
      <input type="hidden" name="pwd" value="${Jesusislord1995}">
      <input name="itemName" placeholder="Name" class="w-full border p-2 rounded" required>
      <input type="number" name="itemPrice" placeholder="Price" class="w-full border p-2 rounded" required>
      <input type="file" name="itemImage" class="w-full" required>
      <button class="w-full bg-black text-white p-3 rounded font-bold">Upload Product</button>
    </form>
    <div class="mt-10">${list}</div></div></body></html>`);
});

// ADD PRODUCT
app.post('/add', isAdmin, upload.single('itemImage'), async (req, res) => {
    try {
        await new Product({ name: req.body.itemName, price: req.body.itemPrice, image: req.file.path }).save();
        res.redirect('/admin?pwd=' + ADMIN_PASSWORD);
    } catch (e) { res.status(500).send("Upload Error: " + e.message); }
});

// DELETE PRODUCT
app.post('/delete', isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.body.id);
    res.redirect('/admin?pwd=' + ADMIN_PASSWORD);
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Server Live'));